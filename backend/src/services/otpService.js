const crypto = require("crypto");
const { Doctor, Patient } = require("../models");
const { sendTextMessage, normalizePhoneNumber } = require("./whatsappService");

const otpStore = new Map();
const OTP_TTL_MS = 24 * 60 * 60 * 1000;

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function buildOtpMessage(code) {
  return `MediScan AI verification code: ${code}. This code expires in 24 hours.`;
}

async function sendOtp(phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    const err = new Error("Valid phone number is required");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const code = generateOtp();
  const createdAt = Date.now();
  otpStore.set(normalizedPhone, {
    code,
    phone: normalizedPhone,
    createdAt,
    expiresAt: createdAt + OTP_TTL_MS,
    attempts: 0
  });

  try {
    await sendTextMessage(normalizedPhone, buildOtpMessage(code));
  } catch (error) {
    otpStore.delete(normalizedPhone);
    throw error;
  }

  return {
    phone: normalizedPhone,
    expires_in_seconds: Math.floor(OTP_TTL_MS / 1000)
  };
}

async function verifyOtp(phone, code) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const record = otpStore.get(normalizedPhone);
  const tokenAgeMs = record ? Date.now() - record.createdAt : Infinity;

  if (!record || tokenAgeMs > OTP_TTL_MS) {
    otpStore.delete(normalizedPhone);
    const err = new Error("Verification code has expired");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  record.attempts += 1;
  if (record.code !== String(code || "").trim()) {
    if (record.attempts >= 5) otpStore.delete(normalizedPhone);
    const err = new Error("Invalid verification code");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  otpStore.delete(normalizedPhone);
  await markPhoneVerified(normalizedPhone);
  return { phone: normalizedPhone, verified: true };
}

async function markPhoneVerified(phone) {
  const updates = { phone, is_verified: true, verification_status: "approved" };

  const [patientCount] = await Patient.update(updates, { where: { phone } });
  if (patientCount === 0) {
    await Doctor.update(updates, { where: { phone } });
  }
}

module.exports = {
  sendOtp,
  verifyOtp
};
