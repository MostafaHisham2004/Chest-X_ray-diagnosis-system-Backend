const { Doctor } = require("../models");
const { ROLES, VERIFICATION_STATUS } = require("../constants/roles");
const { sendError } = require("../utils/response");

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, { statusCode: 401, message: "Unauthorized", code: "UNAUTHORIZED" });
    }
    if (!allowed.includes(req.user.role)) {
      return sendError(res, {
        statusCode: 403,
        message: `Requires role: ${allowed.join(" or ")}`,
        code: "FORBIDDEN"
      });
    }
    next();
  };
}

async function requireVerifiedDoctor(req, res, next) {
  try {
    if (!req.user) {
      return sendError(res, { statusCode: 401, message: "Unauthorized", code: "UNAUTHORIZED" });
    }
    if (req.user.role !== ROLES.DOCTOR) {
      return sendError(res, {
        statusCode: 403,
        message: "Doctors only",
        code: "FORBIDDEN"
      });
    }

    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (!doctor) {
      return sendError(res, {
        statusCode: 403,
        message: "Doctor profile not found",
        code: "FORBIDDEN"
      });
    }
    if (!doctor.is_verified || doctor.verification_status !== VERIFICATION_STATUS.APPROVED) {
      return sendError(res, {
        statusCode: 403,
        message: "Doctor account is not verified yet",
        code: "DOCTOR_NOT_VERIFIED"
      });
    }

    req.doctor = doctor;          // doctor profile row for downstream use
    req.user.profile_id = doctor.id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireRole, requireVerifiedDoctor };

