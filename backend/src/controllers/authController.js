const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Doctor, Patient } = require("../models");
const { sendError, sendSuccess } = require("../utils/response");
const { formatUser } = require("../utils/userPayload");

function signToken(userId, role, isAdmin) {
  return jwt.sign({ sub: userId, role, isAdmin: Boolean(isAdmin) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
}

async function findUserByRole(role, id) {
  const Model = role === "doctor" ? Doctor : Patient;
  return Model.findByPk(id, {
    attributes: ["id", "name", "email", "is_admin"]
  });
}

// Signup is patient only — no role needed from request
async function signup(req, res, next) {
  try {
    const { password, ...payload } = req.body;
    const role = "patient";

    const hashed = await bcrypt.hash(password, 12);
    const baseData = { ...payload, password: hashed };

    const existing = await Patient.findOne({ where: { email: payload.email } });
    if (existing) {
      return sendError(res, { statusCode: 409, message: "Email already in use", code: "CONFLICT" });
    }

    const created = await Patient.create(baseData);
    const token = signToken(created.id, role, created.is_admin);
    const user = formatUser(created, role);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Signup successful",
      data: { token, role, user },
      legacy: { token, role, user }
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Try Doctor first, then Patient — auto-detect role
    let user = await Doctor.findOne({ where: { email } });
    let role = "doctor";

    if (!user) {
      user = await Patient.findOne({ where: { email } });
      role = "patient";
    }

    if (!user) {
      return sendError(res, { statusCode: 401, message: "Invalid credentials", code: "UNAUTHORIZED" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return sendError(res, { statusCode: 401, message: "Invalid credentials", code: "UNAUTHORIZED" });
    }

    const token = signToken(user.id, role, user.is_admin);
    const payload = formatUser(user, role);
    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: { token, role, user: payload },
      legacy: { token, role, user: payload }
    });
  } catch (error) {
    return next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const { sub: userId, role } = req.user;
    const user = await findUserByRole(role, userId);

    if (!user) {
      return sendError(res, { statusCode: 404, message: "User not found", code: "NOT_FOUND" });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Profile loaded",
      data: { user: formatUser(user, role), role }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { signup, login, getMe };
