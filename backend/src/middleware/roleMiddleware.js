function requireAnyRole(allowedRoles = []) {
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, _res, next) => {
    if (!req.user?.role) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      err.code = "UNAUTHORIZED";
      return next(err);
    }

    if (!allowed.includes(req.user.role)) {
      const err = new Error("Forbidden for current role");
      err.statusCode = 403;
      err.code = "FORBIDDEN";
      return next(err);
    }

    return next();
  };
}

function requireRole(role) {
  return requireAnyRole([role]);
}

module.exports = {
  requireRole,
  requireAnyRole
};
