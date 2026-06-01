const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { ROLES } = require("../constants/roles");
const { validateBody } = require("../middleware/validate");
const Joi = require("joi");

const { sendOtpHandler, verifyOtpHandler } = require("../controllers/otpController");

const router = express.Router();

const sendOtpSchema = Joi.object({
  phone: Joi.string().min(6).max(64).required(),
}).required();

const verifyOtpSchema = Joi.object({
  phone: Joi.string().min(6).max(64).required(),
  code: Joi.string().trim().length(6).required(),
}).required();

router.post(
  "/send-otp",
  authMiddleware,
  roleMiddleware([ROLES.DOCTOR]),
  validateBody(sendOtpSchema),
  sendOtpHandler
);

router.post("/verify-otp", validateBody(verifyOtpSchema), verifyOtpHandler);

module.exports = router;
