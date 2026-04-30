const jwt = require("jsonwebtoken");
const { authenticateUser, registerPatient } = require("../services/authService");
const { ASSIGNABLE_SELF_REGISTRATION_ROLE } = require("../constants/roles");
const { sendError, sendSuccess } = require("../utils/response");

function signToken(userId, role) {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
}

// Signup is patient only — no role needed from request
async function signup(req, res, next) {
  try {
    const created = await registerPatient(req.body);
    const token = signToken(created.id, created.role);
    const user = { id: created.id, email: created.email, name: created.name };
    return sendSuccess(res, {
      statusCode: 201,
      message: "Signup successful",
      data: { token, role: ASSIGNABLE_SELF_REGISTRATION_ROLE, user },
      legacy: { token, role: ASSIGNABLE_SELF_REGISTRATION_ROLE, user }
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

    const token = signToken(user.id, user.role);
    const payload = { id: user.id, email: user.email, name: user.name };
    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: { token, role: user.role, user: payload },
      legacy: { token, role: user.role, user: payload }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { signup, login };