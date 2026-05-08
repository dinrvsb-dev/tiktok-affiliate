export function adminAuthMiddleware(config) {
  return function requireAdmin(req, res, next) {
    const authorization = req.headers.authorization || "";
    const [, token] = authorization.split(" ");

    if (!token || token !== config.adminApiKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return next();
  };
}
