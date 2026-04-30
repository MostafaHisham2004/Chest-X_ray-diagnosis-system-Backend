const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getPatientHistory, getDoctorHistory } = require("../controllers/historyController");

const router = express.Router();

router.get("/patient/:id", authMiddleware, getPatientHistory);
router.get("/doctor", authMiddleware, roleMiddleware(["doctor"]), getDoctorHistory);

module.exports = router;
