const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateParams, analyzeIdSchema } = require("../middleware/validate");
const {
  getPatientHistory,
  getMyXrays,
  getMyStats,
  getDoctorHistory,
  getDoctorStats,
  getDoctorPatients
} = require("../controllers/historyController");

const router = express.Router();

router.get(
  "/patient/:id",
  authMiddleware,
  roleMiddleware(["doctor", "patient"]),
  validateParams(analyzeIdSchema),
  getPatientHistory
);
router.get("/my-xrays", authMiddleware, roleMiddleware(["patient"]), getMyXrays);
router.get("/my-stats", authMiddleware, roleMiddleware(["patient"]), getMyStats);
router.get("/doctor", authMiddleware, roleMiddleware(["doctor"]), getDoctorHistory);
router.get("/doctor-stats", authMiddleware, roleMiddleware(["doctor"]), getDoctorStats);
router.get("/doctor-patients", authMiddleware, roleMiddleware(["doctor"]), getDoctorPatients);

module.exports = router;
