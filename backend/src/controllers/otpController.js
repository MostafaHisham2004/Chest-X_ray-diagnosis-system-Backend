const crypto = require("crypto");
const { ROLES, VERIFICATION_STATUS } = require("../constants/roles");
const { Doctor } = require("../models");
const { sendOtp } = require("../services/whatsappService");
const { sendError, sendSuccess } = require("../utils/response");

const OTP_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_MS = 60 * 1000;

const otpStore = new Map();

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

function phoneToJid(phone) {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/[^\d]/g, "");
  return `${digits}@s.whatsapp.net`;
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of otpStore) {
    if (entry.expiresAt <= now) {
      otpStore.delete(key);
    }
  }
}

setInterval(cleanupExpired, 60_000);

async function sendOtpHandler(req, res, next) {
  try {
    if (req.user.role !== ROLES.DOCTOR) {
      return sendError(res, {
        statusCode: 403,
        message: "Only doctors can send OTP codes",
        code: "FORBIDDEN",
      });
    }

    const doctor = await Doctor.findByPk(req.user.profileId);
    if (!doctor || doctor.verification_status !== VERIFICATION_STATUS.APPROVED) {
      return sendError(res, {
        statusCode: 403,
        message: "Doctor account must be approved first",
        code: "FORBIDDEN",
      });
    }

    const rawPhone = String(req.body.phone || "").trim();
    if (!rawPhone || rawPhone.length < 6) {
      return sendError(res, {
        statusCode: 400,
        message: "Valid patient phone number is required",
        code: "VALIDATION_ERROR",
      });
    }

    const normalized = normalizePhone(rawPhone);
    const phoneKey = normalized.replace(/[^\d]/g, "");

    const existing = otpStore.get(phoneKey);
    if (existing && Date.now() - existing.sentAt < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (Date.now() - existing.sentAt)) / 1000);
      return sendError(res, {
        statusCode: 429,
        message: `Please wait ${remaining}s before requesting a new code`,
        code: "RATE_LIMITED",
      });
    }

    const code = generateCode();
    const jid = phoneToJid(rawPhone);

    await sendOtp(jid, code, doctor.name);

    otpStore.set(phoneKey, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      sentAt: Date.now(),
      doctorId: doctor.id,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "OTP sent via WhatsApp",
      data: {
        expires_in_seconds: OTP_TTL_MS / 1000,
        dev_code: process.env.NODE_ENV === "production" ? undefined : code,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyOtpHandler(req, res, next) {
  try {
    const rawPhone = String(req.body.phone || "").trim();
    const inputCode = String(req.body.code || "").trim();

    if (!rawPhone || rawPhone.length < 6) {
      return sendError(res, {
        statusCode: 400,
        message: "Valid phone number is required",
        code: "VALIDATION_ERROR",
      });
    }

    if (!inputCode || inputCode.length !== 6) {
      return sendError(res, {
        statusCode: 400,
        message: "A 6-digit verification code is required",
        code: "VALIDATION_ERROR",
      });
    }

    const normalized = normalizePhone(rawPhone);
    const phoneKey = normalized.replace(/[^\d]/g, "");
    const entry = otpStore.get(phoneKey);

    if (!entry) {
      return sendError(res, {
        statusCode: 400,
        message: "No OTP found for this number. Request a new code.",
        code: "INVALID_OTP",
      });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(phoneKey);
      return sendError(res, {
        statusCode: 400,
        message: "OTP has expired. Request a new code.",
        code: "EXPIRED_OTP",
      });
    }

    if (entry.code !== inputCode) {
      return sendError(res, {
        statusCode: 400,
        message: "Incorrect verification code",
        code: "INVALID_OTP",
      });
    }

    otpStore.delete(phoneKey);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Phone number verified successfully",
      data: { verified: true },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { sendOtpHandler, verifyOtpHandler };
