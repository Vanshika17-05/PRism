export function errorHandler(error, req, res, _next) { // eslint-disable-line no-unused-vars -- Express requires four parameters for error middleware.
  req.log?.error({ err: error }, "Request failed");
  const status = error.name === "ZodError" ? 400 : Number(error.status || error.statusCode) || 500;
  res.status(status).json({ error: status >= 500 ? "Internal server error" : error.message });
}
