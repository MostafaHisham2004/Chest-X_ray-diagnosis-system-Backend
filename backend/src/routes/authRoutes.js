const express = require("express");
const { validateBody, signupSchema, loginSchema } = require("../middleware/validate");
const { signup, login } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);

module.exports = router;
