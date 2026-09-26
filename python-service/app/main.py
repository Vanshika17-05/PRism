import hashlib
import math
import os
import re
import uuid
from pathlib import Path
from typing import Literal

import chromadb
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from radon.complexity import cc_visit
from radon.metrics import mi_visit

load_dotenv()
app = FastAPI(title="PRism Intelligence Service", version="1.1.0")
persist_dir = Path(os.getenv("CHROMA_PERSIST_DIR", "./data/chroma"))
persist_dir.mkdir(parents=True, exist_ok=True)
chroma = chromadb.PersistentClient(path=str(persist_dir))
past_findings = chroma.get_or_create_collection("past_findings", metadata={"hnsw:space": "cosine"})
known_non_issues = chroma.get_or_create_collection("known_non_issues", metadata={"hnsw:space": "cosine"})


class MemoryRequest(BaseModel):
    repoId: str = Field(min_length=1)
    reviewId: str = ""
    findingText: str = Field(min_length=3, max_length=8000)
    file: str = ""
    reason: str = Field(default="", max_length=1000)
    type: Literal["past_finding", "known_non_issue"] = "past_finding"


class SourceFile(BaseModel):
    path: str
    content: str
    language: str


class ComplexityRequest(BaseModel):
    files: list[SourceFile]


def local_embedding(text: str, dimensions: int = 256) -> list[float]:
    """Deterministic local embeddings keep review memory completely free and offline."""
    vector = [0.0] * dimensions
    for token in re.findall(r"[a-zA-Z_][a-zA-Z0-9_]+", text.lower()):
        digest = hashlib.sha256(token.encode()).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        vector[index] += -1.0 if digest[4] % 2 else 1.0
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def nearest(collection, repo_id: str, vector: list[float]):
    if not collection.count():
        return None
    result = collection.query(query_embeddings=[vector], n_results=1, where={"repoId": repo_id}, include=["metadatas", "documents", "distances"])
    if not result.get("ids") or not result["ids"][0]:
        return None
    similarity = max(0.0, 1.0 - float(result["distances"][0][0]))
    return {"id": result["ids"][0][0], "metadata": result["metadatas"][0][0], "text": result["documents"][0][0], "similarity": round(similarity, 4)}


@app.get("/health")
def health():
    return {"status": "ok", "embeddingProvider": "local-deterministic", "storedFindings": past_findings.count(), "suppressionPatterns": known_non_issues.count()}


@app.post("/embed-and-search")
def embed_and_search(body: MemoryRequest):
    vector = local_embedding(body.findingText)
    if body.type == "known_non_issue":
        pattern_id = str(uuid.uuid4())
        known_non_issues.add(ids=[pattern_id], embeddings=[vector], documents=[body.findingText[:1000]], metadatas=[{"repoId": body.repoId, "reviewId": body.reviewId, "file": body.file, "reason": body.reason, "type": "known_non_issue"}])
        return {"stored": True, "id": pattern_id, "match": None, "suppressed": False}

    suppression = nearest(known_non_issues, body.repoId, vector)
    if suppression and suppression["similarity"] >= 0.86:
        return {"match": None, "suppressed": True, "suppression": {"id": suppression["id"], "reason": suppression["metadata"].get("reason", ""), "similarity": suppression["similarity"]}}

    previous = nearest(past_findings, body.repoId, vector)
    match = None
    if previous and previous["similarity"] >= 0.78:
        match = {"reviewId": previous["metadata"].get("reviewId", ""), "findingSummary": previous["text"], "similarity": previous["similarity"]}
    past_findings.add(ids=[str(uuid.uuid4())], embeddings=[vector], documents=[body.findingText[:1000]], metadatas=[{"repoId": body.repoId, "reviewId": body.reviewId, "file": body.file, "type": "past_finding"}])
    return {"match": match, "suppressed": False}


@app.get("/suppressions/{repo_id}")
def list_suppressions(repo_id: str):
    result = known_non_issues.get(where={"repoId": repo_id}, include=["metadatas", "documents"])
    return {"patterns": [{"id": item_id, "text": document, **metadata} for item_id, document, metadata in zip(result["ids"], result["documents"], result["metadatas"])]}


@app.delete("/suppressions/{repo_id}/{pattern_id}")
def delete_suppression(repo_id: str, pattern_id: str):
    result = known_non_issues.get(ids=[pattern_id], where={"repoId": repo_id})
    if not result["ids"]:
        raise HTTPException(status_code=404, detail="Suppression pattern not found")
    known_non_issues.delete(ids=[pattern_id])
    return {"deleted": True}


def basic_metrics(source: SourceFile):
    lines = [line for line in source.content.splitlines() if line.strip()]
    markers = ("#",) if source.language.lower() in ("py", "python") else ("//", "/*", "*")
    comments = sum(1 for line in lines if line.lstrip().startswith(markers))
    return len(lines), round(comments / len(lines), 3) if lines else 0.0


@app.post("/complexity")
def complexity(body: ComplexityRequest):
    output = []
    for source in body.files:
        loc, comment_ratio = basic_metrics(source)
        maintainability = None
        if source.language.lower() in ("py", "python"):
            try:
                blocks = cc_visit(source.content)
                score = sum(block.complexity for block in blocks) / len(blocks) if blocks else 1.0
                maintainability = round(mi_visit(source.content, multi=True), 2)
            except (SyntaxError, ValueError):
                score = 0.0
        else:
            branches = len(re.findall(r"\b(if|for|while|case|catch)\b|&&|\|\||\?", source.content))
            score = 1.0 + branches / max(1, len(re.findall(r"\b(function|=>|class)\b", source.content)))
        output.append({"path": source.path, "complexityScore": round(score, 2), "maintainabilityIndex": maintainability, "linesOfCode": loc, "commentRatio": comment_ratio})
    return {"files": output}
