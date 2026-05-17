const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateParams, analyzeIdSchema } = require("../middleware/validate");
const { getPatientHistory, getDoctorHistory } = require("../controllers/historyController");

const router = express.Router();

router.get(
  "/patient/:id",
  authMiddleware,
  roleMiddleware(["doctor", "patient"]),
  validateParams(analyzeIdSchema),
  getPatientHistory
);
router.get("/doctor", authMiddleware, roleMiddleware(["doctor"]), getDoctorHistory);

module.exports = router;
