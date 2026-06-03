const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { validateBody, otpSendSchema, otpVerifySchema } = require("../middleware/validate");
const { sendOTP, verifyOTP } = require("../controllers/otpController");

const router = express.Router();

router.post("/send", authMiddleware, validateBody(otpSendSchema), sendOTP);
router.post("/verify", validateBody(otpVerifySchema), verifyOTP);

module.exports = router;
