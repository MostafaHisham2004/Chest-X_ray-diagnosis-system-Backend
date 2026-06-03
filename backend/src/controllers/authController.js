const jwt = require("jsonwebtoken");
const { authenticateUser, registerUser } = require("../services/authService");
const { sendTextMessage } = require("../services/whatsappService");

const { sendError, sendSuccess } = require("../utils/response");
const { sequelize, Doctor, User } = require("../models");
const bcrypt = require("bcrypt");

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      profileId: user.profile_id,
      profile_id: user.profile_id,
      isAdmin: Boolean(user.isAdmin)
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
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

    const token = signToken(user.id, user.role);
    const payload = { id: user.id, email: user.email, name: user.name, phone: user.phone };

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

module.exports = { signup, login };
