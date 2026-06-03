function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    const isAllowedRole = req.user && allowedRoles.includes(req.user.role);
    const isAllowedAdmin =
      req.user && allowedRoles.includes("admin") && req.user.isAdmin === true;

    if (!isAllowedRole && !isAllowedAdmin) {
      const err = new Error("Forbidden for current role");
      err.statusCode = 403;
      err.code = "FORBIDDEN";
      return next(err);
    }
    return next();
  };
}

module.exports = roleMiddleware;
