const { sendOtp, verifyOtp } = require("../services/otpService");
const { Doctor, Patient } = require("../models");
const { ROLES } = require("../constants/roles");
const { sendSuccess } = require("../utils/response");

async function getAuthenticatedUserPhone(user) {
  const userId = user?.sub || user?.id;
  if (!userId) return null;

  const model = user.role === ROLES.DOCTOR || user.role === ROLES.ADMIN ? Doctor : Patient;
  const record = await model.findByPk(userId, { attributes: ["phone"] });
  return record?.phone || null;
}

async function sendOtpCode(req, res, next) {
  try {
    const phone = req.body.phone || (await getAuthenticatedUserPhone(req.user));
    const result = await sendOtp(phone);
    return sendSuccess(res, {
      statusCode: 200,
      message: "Verification code sent",
      data: result

    });
  } catch (error) {
    return next(error);
  }
}

async function verifyOtpCode(req, res, next) {
  try {
    const result = await verifyOtp(req.body.phone, req.body.code);
    return sendSuccess(res, {
      statusCode: 200,
      message: "Phone number verified",
      data: result

    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  sendOTP: sendOtpCode,
  verifyOTP: verifyOtpCode,
  sendOtpCode,
  verifyOtpCode
};
