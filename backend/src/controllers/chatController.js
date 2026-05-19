const { Op } = require("sequelize");
const {
  ChatThread,
  ChatMessage,
  Doctor,
  Patient,
  User
} = require("../models");
const { ROLES, VERIFICATION_STATUS } = require("../constants/roles");
const { sendError, sendSuccess } = require("../utils/response");
const { addClient, publishMessage, writeEvent } = require("../utils/chatBus");

const PARTICIPANT_INCLUDES = [
  { model: Patient, as: "patient", include: [{ model: User, as: "user", attributes: ["id", "email", "role"] }] },
  { model: Doctor, as: "doctor", include: [{ model: User, as: "user", attributes: ["id", "email", "role"] }] }
];

function profileIdFromToken(req) {
  return Number(req.user?.profileId || req.user?.profile_id);
}

function isChatRole(req) {
  return req.user?.role === ROLES.PATIENT || req.user?.role === ROLES.DOCTOR;
}

function contactFromProfile(profile, role) {
  const user = profile.user || {};
  return {
    user_id: user.id,
    profile_id: profile.id,
    role,
    name: profile.name,
    email: user.email || "",
    subtitle: role === ROLES.DOCTOR ? profile.specialization : profile.gender,
    is_verified: role === ROLES.DOCTOR ? Boolean(profile.is_verified) : null,
    verification_status: role === ROLES.DOCTOR ? profile.verification_status : null
  };
}

async function serializeThread(thread) {
  const latestMessage = await ChatMessage.findOne({
    where: { thread_id: thread.id },
    order: [["created_at", "DESC"]],
    include: [{ model: User, as: "sender", attributes: ["id", "email", "role"] }]
  });

  return {
    id: thread.id,
    patient: contactFromProfile(thread.patient, ROLES.PATIENT),
    doctor: contactFromProfile(thread.doctor, ROLES.DOCTOR),
    latest_message: latestMessage ? serializeMessage(latestMessage) : null,
    updated_at: thread.updated_at
  };
}

function serializeMessage(message) {
  return {
    id: message.id,
    thread_id: message.thread_id,
    sender_user_id: message.sender_user_id,
    sender: message.sender
      ? {
          id: message.sender.id,
          email: message.sender.email,
          role: message.sender.role
        }
      : null,
    body: message.body,
    created_at: message.created_at,
    read_at: message.read_at
  };
}

async function findThreadForRequester(threadId, req) {
  const thread = await ChatThread.findByPk(threadId, { include: PARTICIPANT_INCLUDES });
  if (!thread) return { error: { statusCode: 404, message: "Chat thread not found", code: "NOT_FOUND" } };

  const profileId = profileIdFromToken(req);
  const role = req.user.role;
  const canAccess =
    (role === ROLES.PATIENT && thread.patient_id === profileId) ||
    (role === ROLES.DOCTOR && thread.doctor_id === profileId);

  if (!canAccess) {
    return { error: { statusCode: 403, message: "You are not a participant in this chat", code: "FORBIDDEN" } };
  }

  return { thread };
}

async function listContacts(req, res, next) {
  try {
    if (!isChatRole(req)) {
      return sendError(res, { statusCode: 403, message: "Chat is available for doctors and patients", code: "FORBIDDEN" });
    }

    const search = String(req.query.search || "").trim().toLowerCase();
    const whereName = search ? { name: { [Op.iLike]: `%${search}%` } } : {};

    if (req.user.role === ROLES.PATIENT) {
      const doctors = await Doctor.findAll({
        where: {
          ...whereName,
          verification_status: VERIFICATION_STATUS.APPROVED
        },
        include: [{ model: User, as: "user", attributes: ["id", "email", "role"] }],
        order: [["name", "ASC"]]
      });
      return sendSuccess(res, {
        message: "Doctor contacts retrieved",
        data: { contacts: doctors.map((doctor) => contactFromProfile(doctor, ROLES.DOCTOR)) }
      });
    }

    const patients = await Patient.findAll({
      where: whereName,
      include: [{ model: User, as: "user", attributes: ["id", "email", "role"] }],
      order: [["name", "ASC"]]
    });
    return sendSuccess(res, {
      message: "Patient contacts retrieved",
      data: { contacts: patients.map((patient) => contactFromProfile(patient, ROLES.PATIENT)) }
    });
  } catch (error) {
    return next(error);
  }
}

async function listThreads(req, res, next) {
  try {
    if (!isChatRole(req)) {
      return sendError(res, { statusCode: 403, message: "Chat is available for doctors and patients", code: "FORBIDDEN" });
    }

    const profileId = profileIdFromToken(req);
    const where =
      req.user.role === ROLES.PATIENT
        ? { patient_id: profileId }
        : { doctor_id: profileId };

    const threads = await ChatThread.findAll({
      where,
      include: PARTICIPANT_INCLUDES,
      order: [["updated_at", "DESC"]]
    });

    const serialized = await Promise.all(threads.map(serializeThread));
    return sendSuccess(res, {
      message: "Chat threads retrieved",
      data: { threads: serialized }
    });
  } catch (error) {
    return next(error);
  }
}

async function createThread(req, res, next) {
  try {
    if (!isChatRole(req)) {
      return sendError(res, { statusCode: 403, message: "Chat is available for doctors and patients", code: "FORBIDDEN" });
    }

    const currentProfileId = profileIdFromToken(req);
    const otherUserId = Number(req.body.user_id);
    let patientId;
    let doctorId;

    if (req.user.role === ROLES.PATIENT) {
      const doctor = await Doctor.findOne({
        where: { user_id: otherUserId, verification_status: VERIFICATION_STATUS.APPROVED }
      });
      if (!doctor) {
        return sendError(res, { statusCode: 404, message: "Doctor contact not found", code: "NOT_FOUND" });
      }
      patientId = currentProfileId;
      doctorId = doctor.id;
    } else {
      const patient = await Patient.findOne({ where: { user_id: otherUserId } });
      if (!patient) {
        return sendError(res, { statusCode: 404, message: "Patient contact not found", code: "NOT_FOUND" });
      }
      patientId = patient.id;
      doctorId = currentProfileId;
    }

    const [thread] = await ChatThread.findOrCreate({
      where: { patient_id: patientId, doctor_id: doctorId },
      defaults: { patient_id: patientId, doctor_id: doctorId }
    });

    const hydrated = await ChatThread.findByPk(thread.id, { include: PARTICIPANT_INCLUDES });
    return sendSuccess(res, {
      statusCode: 201,
      message: "Chat thread ready",
      data: { thread: await serializeThread(hydrated) }
    });
  } catch (error) {
    return next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    const lookup = await findThreadForRequester(req.params.id, req);
    if (lookup.error) return sendError(res, lookup.error);

    const limit = Math.min(Number(req.query.limit || 100), 200);
    const messages = await ChatMessage.findAll({
      where: { thread_id: lookup.thread.id },
      order: [["created_at", "ASC"]],
      limit,
      include: [{ model: User, as: "sender", attributes: ["id", "email", "role"] }]
    });

    return sendSuccess(res, {
      message: "Chat messages retrieved",
      data: { messages: messages.map(serializeMessage) }
    });
  } catch (error) {
    return next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const lookup = await findThreadForRequester(req.params.id, req);
    if (lookup.error) return sendError(res, lookup.error);

    const message = await ChatMessage.create({
      thread_id: lookup.thread.id,
      sender_user_id: req.user.sub,
      body: req.body.body.trim()
    });
    lookup.thread.updated_at = new Date();
    await lookup.thread.save();

    const hydrated = await ChatMessage.findByPk(message.id, {
      include: [{ model: User, as: "sender", attributes: ["id", "email", "role"] }]
    });
    const payload = serializeMessage(hydrated);
    publishMessage(lookup.thread.id, payload);

    return sendSuccess(res, {
      statusCode: 201,
      message: "Message sent",
      data: { message: payload }
    });
  } catch (error) {
    return next(error);
  }
}

async function streamThread(req, res, next) {
  try {
    const lookup = await findThreadForRequester(req.params.id, req);
    if (lookup.error) return sendError(res, lookup.error);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    writeEvent(res, "connected", { thread_id: lookup.thread.id });

    const cleanup = addClient(lookup.thread.id, res);
    const heartbeat = setInterval(() => {
      writeEvent(res, "heartbeat", { at: new Date().toISOString() });
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      cleanup();
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listContacts,
  listThreads,
  createThread,
  listMessages,
  sendMessage,
  streamThread
};
