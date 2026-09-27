import PDFDocument from "pdfkit";
import { z } from "zod";
import { env } from "../config/env.js";
import { queryReviewAnalytics } from "../services/analytics.service.js";
import {
  putStoredObject,
  readLocalObject,
  storedObjectUrl,
} from "../services/storage.service.js";

const dates = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
function range(query) {
  const parsed = dates.parse(query);
  const to = parsed.to || new Date().toISOString();
  const from =
    parsed.from || new Date(Date.now() - 30 * 86_400_000).toISOString();
  return { from, to };
}
function csv(rows) {
  return [
    "date,reviews,findings,high,medium,low,avgDurationMs",
    ...rows.map((row) =>
      [
        row.date,
        row.reviews,
        row.findingsCount,
        row.high,
        row.medium,
        row.low,
        row.avgDuration,
      ].join(","),
    ),
  ].join("\n");
}
async function pdf(rows, title) {
  const doc = new PDFDocument({ margin: 48 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks))),
  );
  doc.fontSize(22).text(title).moveDown();
  doc.fontSize(10);
  rows.forEach((row) =>
    doc.text(
      `${row.date}  Reviews ${row.reviews}  Findings ${row.findingsCount}  H/M/L ${row.high}/${row.medium}/${row.low}  Avg ${row.avgDuration}ms`,
    ),
  );
  doc.end();
  return done;
}
export async function csvReport(req, res) {
  const { from, to } = range(req.query);
  const rows = queryReviewAnalytics(req.params.id, from, to);
  res.type("text/csv").attachment(`prism-${req.params.id}.csv`).send(csv(rows));
}
export async function pdfReport(req, res) {
  const { from, to } = range(req.query);
  const rows = queryReviewAnalytics(req.params.id, from, to);
  const key = await putStoredObject(
    `reports/${req.params.id}/${Date.now()}.pdf`,
    await pdf(rows, "PRism review analytics"),
    "application/pdf",
  );
  res.json({
    url: await storedObjectUrl(key),
    expiresIn: env.USE_S3 ? 300 : null,
  });
}
export async function localDownload(req, res) {
  if (env.USE_S3)
    return res.status(404).json({ error: "Local storage is disabled" });
  const body = await readLocalObject(String(req.query.key || ""));
  res
    .type(req.query.key?.endsWith(".pdf") ? "application/pdf" : "text/plain")
    .send(body);
}
