const jwt = require("jsonwebtoken");
const { authenticateUser, registerUser } = require("../services/authService");
const { sendTextMessage } = require("../services/whatsappService");
const { sendError, sendSuccess } = require("../utils/response");
const { User, Doctor, Patient } = require("../models");

function signToken(userId, role) {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
}

async function signup(req, res, next) {
  try {
    const created = await registerUser(req.body);
    const token = signToken(created.id, created.role);
    const user = {
      id: created.id,
      email: created.email,
      name: created.name,
      phone: created.phone,
      role: created.role
    };

    if (created.phone) {
      sendTextMessage(
        created.phone,
        `Welcome to MediScan AI, ${created.name}. Your ${created.role} account was created successfully.`
      ).catch((error) => {
        // eslint-disable-next-line no-console
        console.warn("[WhatsApp] Signup notification failed:", error.message);
      });
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: "Signup successful",
      data: { token, role: created.role, user },
      legacy: { token, role: created.role, user }
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

    if (user.role === 'DOCTOR' && user.verification_status !== 'approved') {
      return res.status(403).json({ success: false, message: "Account Pending Approval" });
    }

    const token = signToken(user.id, user.role);
    const payload = { id: user.id, email: user.email, name: user.name, phone: user.phone };
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

async function getMe(req, res, next) {
  try {
    const user = await User.findByPk(req.user.sub || req.user.id, {
      include: [
        { model: Doctor, as: "doctor" },
        { model: Patient, as: "patient" }
      ]
    });
    if (!user) {
      return sendError(res, { statusCode: 404, message: "User not found" });
    }

    const token = signToken(user.id, user.role);
    const profile = user.role === "DOCTOR" ? user.doctor : user.patient;
    const payload = {
      id: user.id,
      email: user.email,
      name: profile ? profile.name : "Admin",
      phone: user.phone,
      role: user.role,
      verification_status: user.verification_status
    };

    return sendSuccess(res, {
      statusCode: 200,
      message: "Profile retrieved successfully",
      data: { token, role: user.role, user: payload },
      legacy: { token, role: user.role, user: payload }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { signup, login, getMe };
