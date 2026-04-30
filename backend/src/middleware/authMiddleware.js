const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { sendError } = require("../utils/response");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return sendError(res, {
        statusCode: 401,
        message: "Missing or invalid Authorization header",
        code: "UNAUTHORIZED"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return sendError(res, {
        statusCode: 401,
        message: "Invalid or expired token",
        code: "UNAUTHORIZED"
      });
    }

    // Re-load user — role is authoritative from DB, never from token alone
    const user = await User.findByPk(decoded.sub);
    if (!user) {
      return sendError(res, {
        statusCode: 401,
        message: "User no longer exists",
        code: "UNAUTHORIZED"
      });
    }

    req.user = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,                          // authoritative
      profile_id: decoded.profile_id || null    // hint only
    };
    next();
  } catch (err) {
    next(err);
  }
};