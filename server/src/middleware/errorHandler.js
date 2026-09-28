// Express detects error middleware by its required four-parameter signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  req.log?.error({ err: error }, "Request failed");
  const status =
    error.name === "ZodError"
      ? 400
      : error.name === "MulterError"
        ? error.code === "LIMIT_FILE_SIZE"
          ? 413
          : 400
        : Number(error.status || error.statusCode) || 500;
  res
    .status(status)
    .json({ error: status >= 500 ? "Internal server error" : error.message });
}
