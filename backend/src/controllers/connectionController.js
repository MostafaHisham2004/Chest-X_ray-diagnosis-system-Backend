const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const {
  sequelize,
  ChatThread,
  Doctor,
  Patient,
  PatientDoctorConnection
} = require("../models");
const { ROLES, VERIFICATION_STATUS } = require("../constants/roles");
const { sendError, sendSuccess } = require("../utils/response");

const CODE_TTL_MINUTES = Number(process.env.CONNECTION_CODE_TTL_MINUTES || 15);

function normalizePhone(value) {
  let phone = String(value || "").replace(/[^\d+]/g, "").trim();
  if (phone.startsWith("00")) {
    phone = "+" + phone.slice(2);
  } else if (phone.startsWith("0") && !phone.startsWith("+")) {
    phone = "+20" + phone.slice(1);
  } else if (!phone.startsWith("+")) {
    phone = "+" + phone;
  }
  return phone;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function requestConnection(req, res, next) {
  try {
    if (req.user.role !== ROLES.DOCTOR) {
      return sendError(res, { statusCode: 403, message: "Only doctors can send connection requests", code: "FORBIDDEN" });
    }

    const doctor = await Doctor.findByPk(req.user.profileId);
    if (!doctor || doctor.verification_status !== VERIFICATION_STATUS.APPROVED) {
      return sendError(res, { statusCode: 403, message: "Doctor account must be approved first", code: "FORBIDDEN" });
    }

    const phone = normalizePhone(req.body.phone);
    if (phone.length < 6) {
      return sendError(res, { statusCode: 400, message: "Patient phone number is required", code: "VALIDATION_ERROR" });
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await PatientDoctorConnection.create({
      doctor_id: doctor.id,
      patient_phone: phone,
      code_hash: codeHash,
      status: "pending",
      expires_at: expiresAt
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Connection request created",
      data: {
        expires_at: expiresAt,
        dev_code: process.env.NODE_ENV === "production" ? undefined : code
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyConnection(req, res, next) {
  try {
    if (req.user.role !== ROLES.PATIENT) {
      return sendError(res, { statusCode: 403, message: "Only patients can verify connection codes", code: "FORBIDDEN" });
    }

    const patient = await Patient.findByPk(req.user.profileId);
    if (!patient) {
      return sendError(res, { statusCode: 404, message: "Patient profile not found", code: "NOT_FOUND" });
    }

    const phone = normalizePhone(patient.phone);
    if (!phone) {
      return sendError(res, { statusCode: 400, message: "Add your phone number before connecting to a doctor", code: "VALIDATION_ERROR" });
    }

    const inputCode = String(req.body.code || "").trim();
    const pending = await PatientDoctorConnection.findAll({
      where: {
        patient_phone: phone,
        status: "pending",
        expires_at: { [Op.gt]: new Date() }
      },
      order: [["created_at", "DESC"]]
    });

    let match = null;
    for (const request of pending) {
      if (await bcrypt.compare(inputCode, request.code_hash)) {
        match = request;
        break;
      }
    }

    if (!match) {
      return sendError(res, { statusCode: 400, message: "Invalid or expired doctor code", code: "VALIDATION_ERROR" });
    }

    const result = await sequelize.transaction(async (t) => {
      match.status = "verified";
      match.linked_patient_id = patient.id;
      match.verified_at = new Date();
      match.updated_at = new Date();
      await match.save({ transaction: t });

      const [thread] = await ChatThread.findOrCreate({
        where: { patient_id: patient.id, doctor_id: match.doctor_id },
        defaults: { patient_id: patient.id, doctor_id: match.doctor_id },
        transaction: t
      });

      return { request: match, thread };
    });

    return sendSuccess(res, {
      message: "Doctor connected successfully",
      data: { connection_id: result.request.id, thread_id: result.thread.id }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { requestConnection, verifyConnection, normalizePhone };
