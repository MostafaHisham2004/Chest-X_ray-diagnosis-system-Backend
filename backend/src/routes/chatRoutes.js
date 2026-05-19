const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { ROLES } = require("../constants/roles");
const {
  validateBody,
  validateParams,
  analyzeIdSchema,
  chatThreadSchema,
  chatMessageSchema
} = require("../middleware/validate");
const {
  listContacts,
  listThreads,
  createThread,
  listMessages,
  sendMessage,
  streamThread
} = require("../controllers/chatController");

const router = express.Router();

router.use(authMiddleware, roleMiddleware([ROLES.PATIENT, ROLES.DOCTOR]));

router.get("/contacts", listContacts);
router.get("/threads", listThreads);
router.post("/threads", validateBody(chatThreadSchema), createThread);
router.get("/threads/:id/messages", validateParams(analyzeIdSchema), listMessages);
router.post(
  "/threads/:id/messages",
  validateParams(analyzeIdSchema),
  validateBody(chatMessageSchema),
  sendMessage
);
router.get("/threads/:id/stream", validateParams(analyzeIdSchema), streamThread);

module.exports = router;
