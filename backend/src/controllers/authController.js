const jwt = require("jsonwebtoken");
const { registerPatient, authenticateUser, getCurrentUser } = require("../services/authService");
const { sendError, sendSuccess } = require("../utils/response");

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      profileId: user.profile_id,
      isAdmin: Boolean(user.isAdmin)
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

// Signup is patient only - no role needed from request.
async function signup(req, res, next) {
  try {
    const user = await registerPatient(req.body);
    const token = signToken(user);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Signup successful",
      data: { token, role: user.role, user },
      legacy: { token, role: user.role, user }
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const user = await authenticateUser(req.body);
    if (!user) {
      return sendError(res, { statusCode: 401, message: "Invalid credentials", code: "UNAUTHORIZED" });
    }

    const token = signToken(user);
    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: { token, role: user.role, user },
      legacy: { token, role: user.role, user }
    });
  } catch (error) {
    return next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.sub);

    if (!user) {
      return sendError(res, { statusCode: 404, message: "User not found", code: "NOT_FOUND" });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Profile loaded",
      data: { user, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { signup, login, getMe };
