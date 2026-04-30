const jwt = require("jsonwebtoken");

const {
  authenticateUser,
  registerPatient,
  registerDoctor
} = require("../services/authService");
const { ROLES, ASSIGNABLE_SELF_REGISTRATION_ROLE } = require("../constants/roles");

const { sendError, sendSuccess } = require("../utils/response");

function signToken(user) {
  // JWT payload mirrors your existing convention: sub + role
  // profile_id added so downstream controllers don't need extra DB hits
  return jwt.sign(
    { sub: user.id, role: user.role, profile_id: user.profile_id || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

// PATIENT signup — role IGNORED from body, forced to 'patient'
async function signup(req, res, next) {
  try {
    const created = await registerPatient(req.body);
    const token = signToken(created);

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

// DOCTOR signup — separate endpoint; role forced to 'doctor', awaits verification
async function signupDoctor(req, res, next) {
  try {
    const created = await registerDoctor(req.body);
    const token = signToken(created);
    const user = { id: created.id, email: created.email, name: created.name };
    return sendSuccess(res, {
      statusCode: 201,
      message: "Doctor registered. Awaiting admin verification.",
      data: {
        token,
        role: ROLES.DOCTOR,
        user,
        verification_status: created.verification_status,
        is_verified: created.is_verified
      },
      legacy: {
        token,
        role: ROLES.DOCTOR,
        user,
        verification_status: created.verification_status
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const user = await authenticateUser(req.body);
    if (!user) {
      return sendError(res, {
        statusCode: 401,
        message: "Invalid credentials",
        code: "UNAUTHORIZED"
      });
    }

    const token = signToken(user);

    const payload = { id: user.id, email: user.email, name: user.name };
    const extra =
      user.role === ROLES.DOCTOR
        ? {
            verification_status: user.verification_status,
            is_verified: user.is_verified
          }
        : {};

    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: { token, role: user.role, user: payload, ...extra },
      legacy: { token, role: user.role, user: payload, ...extra }

    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { signup, signupDoctor, login };
