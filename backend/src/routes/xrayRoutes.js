const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { validateParams, validateXrayUpload, analyzeIdSchema } = require("../middleware/validate");
const { uploadXray, analyzeXray } = require("../controllers/xrayController");

const router = express.Router();

router.post("/upload", authMiddleware, upload.single("xray"), validateXrayUpload, uploadXray);
router.post(
  "/analyze/:id",
  authMiddleware,
  requireRole("doctor"),
  validateParams(analyzeIdSchema),
  analyzeXray
);

module.exports = router;
