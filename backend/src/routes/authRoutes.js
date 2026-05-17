const express = require("express");
const { validateBody, signupSchema, loginSchema } = require("../middleware/validate");
const authMiddleware = require("../middleware/authMiddleware");
const { signup, login, getMe } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", authMiddleware, getMe);

module.exports = router;
