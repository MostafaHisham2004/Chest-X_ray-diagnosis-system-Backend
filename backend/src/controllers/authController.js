const jwt = require("jsonwebtoken");
const { registerPatient, registerDoctor, authenticateUser, getCurrentUser, updateCurrentUser, deleteCurrentUser } = require("../services/authService");
const { ROLES, VERIFICATION_STATUS } = require("../constants/roles");
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
    const isDoctor = req.body.role === "doctor";
    const user = isDoctor ? await registerDoctor(req.body) : await registerPatient(req.body);
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

async function updateMe(req, res, next) {
  try {
    const allowedFields = ["name", "phone", "gender", "dob", "medical_history", "email", "password", "specialization"];
    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      return sendError(res, { statusCode: 400, message: "No valid fields to update", code: "VALIDATION_ERROR" });
    }

    const user = await updateCurrentUser(req.user.sub, updates);
    if (!user) {
      return sendError(res, { statusCode: 404, message: "User not found", code: "NOT_FOUND" });
    }

    return sendSuccess(res, {
      message: "Profile updated",
      data: { user, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
}

async function requestDoctor(req, res, next) {
  const { name, specialization, medical_certificate } = req.body;
  if (!name || !specialization) {
    return sendError(res, { statusCode: 400, message: "Name and specialization are required", code: "VALIDATION_ERROR" });
  }

  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) {
      return sendError(res, { statusCode: 404, message: "User not found", code: "NOT_FOUND" });
    }
    if (user.role !== ROLES.PATIENT) {
      return sendError(res, { statusCode: 400, message: "Only patients can request doctor role", code: "VALIDATION_ERROR" });
    }

    const existingDoctor = await Doctor.findOne({ where: { user_id: user.id } });
    if (existingDoctor) {
      return sendError(res, { statusCode: 400, message: "You already have a doctor profile", code: "CONFLICT" });
    }

    await sequelize.transaction(async (t) => {
      await Doctor.create({
        user_id: user.id,
        name,
        specialization,
        medical_certificate: medical_certificate || "Pending submission",
        is_verified: false,
        verification_status: VERIFICATION_STATUS.PENDING
      }, { transaction: t });
      await user.update({ role: ROLES.DOCTOR, updated_at: new Date() }, { transaction: t });
    });

    const updated = await getCurrentUser(user.id);
    return sendSuccess(res, {
      message: "Doctor request submitted. Pending admin verification.",
      data: { user: updated, role: updated.role }
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteMe(req, res, next) {
  try {
    const { password } = req.body;
    if (!password) {
      return sendError(res, { statusCode: 400, message: "Password confirmation is required", code: "VALIDATION_ERROR" });
    }

    const deleted = await deleteCurrentUser(req.user.sub, password);
    if (!deleted) {
      return sendError(res, { statusCode: 401, message: "Password confirmation failed", code: "UNAUTHORIZED" });
    }

    return sendSuccess(res, {
      message: "Account deleted",
      data: { id: req.user.sub }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { signup, login, getMe, updateMe, requestDoctor, deleteMe };
