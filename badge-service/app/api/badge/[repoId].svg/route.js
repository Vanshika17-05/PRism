import { badgeRateLimit } from "../../../../lib/rateLimit";

const escapeXml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char],
  );
export async function GET(request, { params }) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (badgeRateLimit) {
    const result = await badgeRateLimit.limit(ip);
    if (!result.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000),
      );
      return Response.json(
        { error: "rate_limit_exceeded", retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "Cache-Control": "no-store",
          },
        },
      );
    }
  }
  const { repoId } = await params;
  const base = process.env.PRISM_API_URL || "http://localhost:4100";
  const response = await fetch(
    `${base}/api/public/repos/${encodeURIComponent(repoId)}/score`,
    { next: { revalidate: 60 } },
  );
  const data = response.ok ? await response.json() : { score: "unknown" };
  const score = escapeXml(data.score);
  const color =
    Number(data.score) >= 80
      ? "#B5502E"
      : Number(data.score) >= 60
        ? "#EAB308"
        : "#E5484D";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="156" height="20" role="img" aria-label="PRism score: ${score}"><clipPath id="r"><rect width="156" height="20" rx="3"/></clipPath><g clip-path="url(#r)"><rect width="90" height="20" fill="#2B1A12"/><rect x="90" width="66" height="20" fill="${color}"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,sans-serif" font-size="11"><text x="45" y="14">PRism score</text><text x="123" y="14">${score}/100</text></g></svg>`;
  return new Response(svg, {
    status: response.ok ? 200 : 503,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
