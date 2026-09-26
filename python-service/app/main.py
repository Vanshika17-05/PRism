import hashlib
import math
import os
import re
import uuid
from pathlib import Path
from typing import Literal

import chromadb
from dotenv import load_dotenv
from fastapi import FastAPI
from langchain_openai import OpenAIEmbeddings
from pydantic import BaseModel, Field
from radon.complexity import cc_visit
from radon.metrics import mi_visit

load_dotenv()
app = FastAPI(title="PRism Intelligence Service", version="1.0.0")
persist_dir = Path(os.getenv("CHROMA_PERSIST_DIR", "./data/chroma"))
persist_dir.mkdir(parents=True, exist_ok=True)
collection = chromadb.PersistentClient(path=str(persist_dir)).get_or_create_collection("review_memory", metadata={"hnsw:space": "cosine"})
openai_key = os.getenv("OPENAI_API_KEY", "").strip()
embedder = OpenAIEmbeddings(api_key=openai_key, model="text-embedding-3-small") if openai_key else None


class MemoryRequest(BaseModel):
    repoId: str = Field(min_length=1)
    reviewId: str = ""
    findingText: str = Field(min_length=3, max_length=8000)


class SourceFile(BaseModel):
    path: str
    content: str
    language: str


class ComplexityRequest(BaseModel):
    files: list[SourceFile]


def local_embedding(text: str, dimensions: int = 256) -> list[float]:
    vector = [0.0] * dimensions
    for token in re.findall(r"[a-zA-Z_][a-zA-Z0-9_]+", text.lower()):
        digest = hashlib.sha256(token.encode()).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        vector[index] += -1.0 if digest[4] % 2 else 1.0
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def embed(text: str) -> list[float]:
    return embedder.embed_query(text) if embedder else local_embedding(text)


@app.get("/health")
def health():
    return {"status": "ok", "embeddingProvider": "openai" if embedder else "local-development-fallback", "storedFindings": collection.count()}


@app.post("/embed-and-search")
def embed_and_search(body: MemoryRequest):
    vector = embed(body.findingText)
    match = None
    if collection.count():
        result = collection.query(query_embeddings=[vector], n_results=1, where={"repoId": body.repoId}, include=["metadatas", "documents", "distances"])
        if result.get("ids") and result["ids"][0]:
            similarity = max(0.0, 1.0 - float(result["distances"][0][0]))
            metadata = result["metadatas"][0][0]
            if similarity >= 0.78:
                match = {"reviewId": metadata.get("reviewId", ""), "findingSummary": result["documents"][0][0], "similarity": round(similarity, 4)}
    collection.add(ids=[str(uuid.uuid4())], embeddings=[vector], documents=[body.findingText[:1000]], metadatas=[{"repoId": body.repoId, "reviewId": body.reviewId}])
    return {"match": match}


def basic_metrics(source: SourceFile):
    lines = [line for line in source.content.splitlines() if line.strip()]
    language = source.language.lower()
    markers = ("#",) if language in ("py", "python") else ("//", "/*", "*")
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
