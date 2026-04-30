function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const err = new Error("Forbidden for current role");
      err.statusCode = 403;
      err.code = "FORBIDDEN";
      return next(err);
    }
    return next();
  };
}

module.exports = roleMiddleware;
