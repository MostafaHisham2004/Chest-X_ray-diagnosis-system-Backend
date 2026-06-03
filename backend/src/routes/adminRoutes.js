const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { ROLES } = require("../constants/roles");
const {
  validateBody,
  validateParams,
  verifyDoctorSchema,
  analyzeIdSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema
} = require("../middleware/validate");
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getActivity,
  listPendingDoctors,
  verifyDoctor
} = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware([ROLES.ADMIN]));

router.get("/users", listUsers);
router.post("/users", validateBody(adminCreateUserSchema), createUser);
router.patch(
  "/users/:id",
  validateParams(analyzeIdSchema),
  validateBody(adminUpdateUserSchema),
  updateUser
);
router.delete("/users/:id", validateParams(analyzeIdSchema), deleteUser);
router.get("/activity", getActivity);
router.get("/doctors/pending", listPendingDoctors);
router.patch(
  "/doctors/:id/verify",
  validateParams(analyzeIdSchema),       // reuses positive-int id schema
  validateBody(verifyDoctorSchema),
  verifyDoctor
);

module.exports = router;
