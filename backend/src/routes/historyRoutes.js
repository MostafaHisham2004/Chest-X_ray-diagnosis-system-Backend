const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../constants/roles");
const { getPatientHistory, getDoctorHistory } = require("../controllers/historyController");

const router = express.Router();

router.get("/patient/:id", authMiddleware, getPatientHistory);
router.get("/doctor", authMiddleware, requireRole(ROLES.DOCTOR), getDoctorHistory);

module.exports = router;
