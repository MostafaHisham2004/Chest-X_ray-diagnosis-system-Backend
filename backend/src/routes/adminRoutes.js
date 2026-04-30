const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ROLES } = require("../constants/roles");
const {
  validateBody,
  validateParams,
  verifyDoctorSchema,
  analyzeIdSchema
} = require("../middleware/validate");
const { listPendingDoctors, verifyDoctor } = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware, requireRole(ROLES.ADMIN));

router.get("/doctors/pending", listPendingDoctors);
router.patch(
  "/doctors/:id/verify",
  validateParams(analyzeIdSchema),       // reuses positive-int id schema
  validateBody(verifyDoctorSchema),
  verifyDoctor
);

module.exports = router;
