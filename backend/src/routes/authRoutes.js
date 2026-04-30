const express = require("express");
const {
  validateBody,
  signupSchema,
  doctorSignupSchema,
  loginSchema
} = require("../middleware/validate");
const { signup, signupDoctor, login } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", validateBody(signupSchema), signup);                  // patient only
router.post("/signup/doctor", validateBody(doctorSignupSchema), signupDoctor); // separate doctor endpoint
router.post("/login", validateBody(loginSchema), login);

module.exports = router;
