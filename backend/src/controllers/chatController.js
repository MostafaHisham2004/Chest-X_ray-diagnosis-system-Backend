const { User, Doctor, Patient, Contact, ChatThread, ChatMessage } = require("../models");
const { sendContactOtp, verifyContactOtp } = require("../services/otpService");
const { normalizePhoneNumber } = require("../services/whatsappService");
const { sendSuccess, sendError } = require("../utils/response");

const activeStreams = new Map();

async function getContacts(req, res, next) {
  try {
    const userId = req.user.sub;
    const role = req.user.role;

    const contacts = [];

    if (role === "PATIENT") {
      const dbContacts = await Contact.findAll({
        where: { patient_id: userId },
        include: [{ model: Doctor, as: "doctor" }]
      });

      for (const contact of dbContacts) {
        if (contact.doctor) {
          contacts.push({
            user_id: contact.doctor.id,
            profile_id: contact.doctor.id,
            role: "doctor",
            name: contact.doctor.name,
            email: contact.doctor.email,
            phone: contact.doctor.phone,
            subtitle: contact.doctor.specialization || "Doctor",
            is_verified: contact.doctor.is_verified,
            verification_status: contact.status
          });
        }
      }
    } else if (role === "DOCTOR") {
      const dbContacts = await Contact.findAll({
        where: { doctor_id: userId },
        include: [{ model: Patient, as: "patient" }]
      });

      for (const contact of dbContacts) {
        if (contact.patient) {
          contacts.push({
            user_id: contact.patient.id,
            profile_id: contact.patient.id,
            role: "patient",
            name: contact.patient.name,
            email: contact.patient.email,
            phone: contact.patient.phone,
            subtitle: `${contact.patient.gender || "Other"}, ${contact.patient.dob || "N/A"}`,
            is_verified: contact.patient.is_verified,
            verification_status: contact.status
          });
        }
      }
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Contacts retrieved successfully.",
      data: { contacts }
    });
  } catch (error) {
    return next(error);
  }
}

async function getThreads(req, res, next) {
  try {
    const userId = req.user.sub;
    const role = req.user.role;

    const where = {};
    if (role === "PATIENT") {
      where.patient_id = userId;
    } else if (role === "DOCTOR") {
      where.doctor_id = userId;
    } else {
      return sendSuccess(res, {
        statusCode: 200,
        message: "Threads retrieved successfully.",
        data: { threads: [] }
      });
    }

    const threads = await ChatThread.findAll({
      where,
      include: [
        { model: Patient, as: "patient" },
        { model: Doctor, as: "doctor" }
      ],
      order: [["updated_at", "DESC"]]
    });

    const serializedThreads = [];
    for (const thread of threads) {
      if (!thread.patient || !thread.doctor) continue;

      const latestMessage = await ChatMessage.findOne({
        where: { thread_id: thread.id },
        order: [["created_at", "DESC"]]
      });

      const contact = await Contact.findOne({
        where: { doctor_id: thread.doctor_id, patient_id: thread.patient_id }
      });
      const status = contact ? contact.status : "PENDING_VERIFICATION";

      serializedThreads.push({
        id: thread.id,
        patient: {
          user_id: thread.patient.id,
          profile_id: thread.patient.id,
          role: "patient",
          name: thread.patient.name,
          email: thread.patient.email,
          phone: thread.patient.phone,
          subtitle: `${thread.patient.gender || "Other"}, ${thread.patient.dob || ""}`,
          is_verified: thread.patient.is_verified,
          verification_status: status
        },
        doctor: {
          user_id: thread.doctor.id,
          profile_id: thread.doctor.id,
          role: "doctor",
          name: thread.doctor.name,
          email: thread.doctor.email,
          phone: thread.doctor.phone,
          subtitle: thread.doctor.specialization || "Doctor",
          is_verified: thread.doctor.is_verified,
          verification_status: status
        },
        latest_message: latestMessage
          ? {
              id: latestMessage.id,
              thread_id: latestMessage.thread_id,
              sender_user_id: latestMessage.sender_user_id,
              body: latestMessage.body,
              created_at: latestMessage.created_at
            }
          : null,
        updated_at: thread.updated_at
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Threads retrieved successfully.",
      data: { threads: serializedThreads }
    });
  } catch (error) {
    return next(error);
  }
}

async function requestConnection(req, res, next) {
  try {
    const doctorId = req.user.sub;
    const { phone } = req.body;

    if (req.user.role !== "DOCTOR") {
      return sendError(res, {
        statusCode: 403,
        message: "Only doctors can initiate contact connections.",
        code: "FORBIDDEN"
      });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      return sendError(res, {
        statusCode: 400,
        message: "Valid phone number is required.",
        code: "VALIDATION_ERROR"
      });
    }

    const patientUser = await User.findOne({
      where: { phone: normalizedPhone, role: "PATIENT" }
    });

    if (!patientUser) {
      return sendError(res, {
        statusCode: 404,
        message: "Patient with this phone number is not registered.",
        code: "NOT_FOUND"
      });
    }

    let contact = await Contact.findOne({
      where: { doctor_id: doctorId, patient_id: patientUser.id }
    });

    if (contact && contact.status === "ACTIVE") {
      return sendError(res, {
        statusCode: 400,
        message: "You are already connected to this patient.",
        code: "BAD_REQUEST"
      });
    }

    if (!contact) {
      contact = await Contact.create({
        doctor_id: doctorId,
        patient_id: patientUser.id,
        status: "PENDING_VERIFICATION"
      });
    }

    await sendContactOtp(patientUser.phone, doctorId);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Connection request initiated. Verification code sent to patient."
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyConnection(req, res, next) {
  try {
    const patientId = req.user.sub;
    const { code } = req.body;

    if (req.user.role !== "PATIENT") {
      return sendError(res, {
        statusCode: 403,
        message: "Only patients can verify connection authorization.",
        code: "FORBIDDEN"
      });
    }

    const patientUser = await User.findByPk(patientId);
    if (!patientUser || !patientUser.phone) {
      return sendError(res, {
        statusCode: 400,
        message: "Patient profile is missing a registered phone number.",
        code: "BAD_REQUEST"
      });
    }

    const record = await verifyContactOtp(patientUser.phone, code);

    const contact = await Contact.findOne({
      where: { doctor_id: record.doctorId, patient_id: patientId }
    });

    if (!contact) {
      return sendError(res, {
        statusCode: 404,
        message: "Pending connection request not found.",
        code: "NOT_FOUND"
      });
    }

    await contact.update({ status: "ACTIVE" });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Connection verified successfully."
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, {
        statusCode: error.statusCode,
        message: error.message,
        code: error.code || "VERIFICATION_ERROR"
      });
    }
    return next(error);
  }
}

async function createThread(req, res, next) {
  try {
    const currentUserId = req.user.sub;
    const currentUserRole = req.user.role;
    const { user_id } = req.body;

    let doctorId, patientId;
    if (currentUserRole === "DOCTOR") {
      doctorId = currentUserId;
      patientId = Number(user_id);
    } else if (currentUserRole === "PATIENT") {
      doctorId = Number(user_id);
      patientId = currentUserId;
    } else {
      return sendError(res, {
        statusCode: 403,
        message: "Admins cannot participate in chat threads.",
        code: "FORBIDDEN"
      });
    }

    const contact = await Contact.findOne({
      where: { doctor_id: doctorId, patient_id: patientId }
    });

    if (!contact || contact.status !== "ACTIVE") {
      return sendError(res, {
        statusCode: 403,
        message: "Active connection is required to start a chat thread.",
        code: "FORBIDDEN"
      });
    }

    let thread = await ChatThread.findOne({
      where: { doctor_id: doctorId, patient_id: patientId },
      include: [
        { model: Patient, as: "patient" },
        { model: Doctor, as: "doctor" }
      ]
    });

    if (!thread) {
      thread = await ChatThread.create({
        doctor_id: doctorId,
        patient_id: patientId
      });
      thread = await ChatThread.findByPk(thread.id, {
        include: [
          { model: Patient, as: "patient" },
          { model: Doctor, as: "doctor" }
        ]
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Chat thread ready.",
      data: {
        thread: {
          id: thread.id,
          patient: {
            user_id: thread.patient.id,
            profile_id: thread.patient.id,
            role: "patient",
            name: thread.patient.name,
            email: thread.patient.email,
            phone: thread.patient.phone,
            subtitle: `${thread.patient.gender || "Other"}, ${thread.patient.dob || ""}`,
            is_verified: thread.patient.is_verified,
            verification_status: contact.status
          },
          doctor: {
            user_id: thread.doctor.id,
            profile_id: thread.doctor.id,
            role: "doctor",
            name: thread.doctor.name,
            email: thread.doctor.email,
            phone: thread.doctor.phone,
            subtitle: thread.doctor.specialization || "Doctor",
            is_verified: thread.doctor.is_verified,
            verification_status: contact.status
          },
          latest_message: null,
          updated_at: thread.updated_at
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const userId = req.user.sub;
    const threadId = Number(req.params.threadId);

    const thread = await ChatThread.findByPk(threadId);
    if (!thread) {
      return sendError(res, {
        statusCode: 404,
        message: "Thread not found.",
        code: "NOT_FOUND"
      });
    }

    if (thread.patient_id !== userId && thread.doctor_id !== userId) {
      return sendError(res, {
        statusCode: 403,
        message: "You are not a participant in this thread.",
        code: "FORBIDDEN"
      });
    }

    const contact = await Contact.findOne({
      where: { doctor_id: thread.doctor_id, patient_id: thread.patient_id }
    });

    if (!contact || contact.status !== "ACTIVE") {
      return sendError(res, {
        statusCode: 403,
        message: "Active connection is required to retrieve messages.",
        code: "FORBIDDEN"
      });
    }

    const messages = await ChatMessage.findAll({
      where: { thread_id: threadId },
      order: [["created_at", "ASC"]]
    });

    const serializedMessages = messages.map((m) => ({
      id: m.id,
      thread_id: m.thread_id,
      sender_user_id: m.sender_user_id,
      body: m.body,
      created_at: m.created_at
    }));

    return sendSuccess(res, {
      statusCode: 200,
      message: "Messages retrieved successfully.",
      data: { messages: serializedMessages }
    });
  } catch (error) {
    return next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const userId = req.user.sub;
    const threadId = Number(req.params.threadId);
    const { body } = req.body;

    if (!body || !String(body).trim()) {
      return sendError(res, {
        statusCode: 400,
        message: "Message body cannot be empty.",
        code: "VALIDATION_ERROR"
      });
    }

    const thread = await ChatThread.findByPk(threadId);
    if (!thread) {
      return sendError(res, {
        statusCode: 404,
        message: "Thread not found.",
        code: "NOT_FOUND"
      });
    }

    if (thread.patient_id !== userId && thread.doctor_id !== userId) {
      return sendError(res, {
        statusCode: 403,
        message: "You are not a participant in this thread.",
        code: "FORBIDDEN"
      });
    }

    const contact = await Contact.findOne({
      where: { doctor_id: thread.doctor_id, patient_id: thread.patient_id }
    });

    if (!contact || contact.status !== "ACTIVE") {
      return sendError(res, {
        statusCode: 403,
        message: "Active connection is required to send messages.",
        code: "FORBIDDEN"
      });
    }

    const message = await ChatMessage.create({
      thread_id: threadId,
      sender_user_id: userId,
      body: String(body).trim()
    });

    await thread.update({ updated_at: new Date() });

    const payload = {
      id: message.id,
      thread_id: message.thread_id,
      sender_user_id: message.sender_user_id,
      body: message.body,
      created_at: message.created_at
    };

    const clients = activeStreams.get(threadId);
    if (clients) {
      for (const client of clients) {
        try {
          client.write(`event: message\n`);
          client.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("[SSE] Error sending payload to client:", err.message);
        }
      }
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: "Message sent successfully.",
      data: { message: payload }
    });
  } catch (error) {
    return next(error);
  }
}

async function streamMessages(req, res, next) {
  try {
    const userId = req.user.sub;
    const threadId = Number(req.params.threadId);

    const thread = await ChatThread.findByPk(threadId);
    if (!thread) {
      return res.status(404).end();
    }

    if (thread.patient_id !== userId && thread.doctor_id !== userId) {
      return res.status(403).end();
    }

    const contact = await Contact.findOne({
      where: { doctor_id: thread.doctor_id, patient_id: thread.patient_id }
    });

    if (!contact || contact.status !== "ACTIVE") {
      return res.status(403).end();
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    res.write("\n");

    if (!activeStreams.has(threadId)) {
      activeStreams.set(threadId, new Set());
    }
    activeStreams.get(threadId).add(res);

    req.on("close", () => {
      const clients = activeStreams.get(threadId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) {
          activeStreams.delete(threadId);
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getContacts,
  getThreads,
  requestConnection,
  verifyConnection,
  createThread,
  getMessages,
  sendMessage,
  streamMessages
};
