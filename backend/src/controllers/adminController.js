const bcrypt = require("bcrypt");
const { sequelize, ChatMessage, Doctor, Patient, User, XrayImage } = require("../models");
const { ROLES, VERIFICATION_STATUS } = require("../constants/roles");
const { registerDoctor, registerPatient } = require("../services/authService");
const { sendSuccess, sendError } = require("../utils/response");

function profileForUser(user) {
  if (user.role === ROLES.PATIENT) return user.patientProfile || null;
  if (user.role === ROLES.DOCTOR) return user.doctorProfile || null;
  return null;
}

function serializeManagedUser(user) {
  const profile = profileForUser(user);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: profile?.name || (user.role === ROLES.ADMIN ? "Admin" : ""),
    profile_id: profile?.id || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
    phone: user.role === ROLES.PATIENT ? profile?.phone || null : null,
    gender: user.role === ROLES.PATIENT ? profile?.gender || null : null,
    dob: user.role === ROLES.PATIENT ? profile?.dob || null : null,
    medical_history: user.role === ROLES.PATIENT ? profile?.medical_history || "" : null,
    specialization: user.role === ROLES.DOCTOR ? profile?.specialization || "" : null,
    medical_certificate: user.role === ROLES.DOCTOR ? profile?.medical_certificate || "" : null,
    is_verified: user.role === ROLES.DOCTOR ? Boolean(profile?.is_verified) : null,
    verification_status: user.role === ROLES.DOCTOR ? profile?.verification_status || null : null
  };
}

async function findManagedUser(id, transaction = null) {
  return User.findByPk(id, {
    include: [
      { model: Patient, as: "patientProfile" },
      { model: Doctor, as: "doctorProfile" }
    ],
    transaction
  });
}

async function listUsers(req, res, next) {
  try {
    const role = String(req.query.role || "").trim();
    const search = String(req.query.search || "").trim().toLowerCase();

    const users = await User.findAll({
      where: role ? { role } : undefined,
      include: [
        { model: Patient, as: "patientProfile" },
        { model: Doctor, as: "doctorProfile" }
      ],
      order: [["created_at", "DESC"]]
    });

    const managedUsers = users.map(serializeManagedUser);
    const filtered = search
      ? managedUsers.filter((user) =>
          [user.name, user.email, user.role].some((value) =>
            String(value || "").toLowerCase().includes(search)
          )
        )
      : managedUsers;

    return sendSuccess(res, {
      message: "Users retrieved",
      data: { count: filtered.length, users: filtered },
      legacy: { count: filtered.length, users: filtered }
    });
  } catch (err) {
    return next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { role } = req.body;
    let created;

    if (role === ROLES.PATIENT) {
      created = await registerPatient(req.body);
    } else if (role === ROLES.DOCTOR) {
      created = await registerDoctor(req.body);
      if (req.body.verification_status) {
        const doctor = await Doctor.findByPk(created.profile_id);
        doctor.verification_status = req.body.verification_status;
        doctor.is_verified = req.body.verification_status === VERIFICATION_STATUS.APPROVED;
        if (doctor.is_verified) {
          doctor.verified_at = new Date();
          doctor.verified_by = req.user.sub;
        }
        await doctor.save();
      }
    } else {
      const normalizedEmail = String(req.body.email).toLowerCase().trim();
      const existing = await User.findOne({ where: { email: normalizedEmail } });
      if (existing) {
        return sendError(res, {
          statusCode: 409,
          message: "Email already registered",
          code: "CONFLICT"
        });
      }
      const password = await bcrypt.hash(req.body.password, 12);
      const admin = await User.create({
        email: normalizedEmail,
        password,
        role: ROLES.ADMIN
      });
      created = { id: admin.id };
    }

    const hydrated = await findManagedUser(created.id);
    return sendSuccess(res, {
      statusCode: 201,
      message: "User created",
      data: { user: serializeManagedUser(hydrated) },
      legacy: { user: serializeManagedUser(hydrated) }
    });
  } catch (err) {
    return next(err);
  }
}

async function updateUser(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const user = await findManagedUser(req.params.id, t);
    if (!user) {
      await t.rollback();
      return sendError(res, { statusCode: 404, message: "User not found", code: "NOT_FOUND" });
    }

    const updates = {};
    if (req.body.email) updates.email = req.body.email;
    if (req.body.password) updates.password = await bcrypt.hash(req.body.password, 12);
    if (req.body.role) updates.role = req.body.role;
    if (Object.keys(updates).length) {
      updates.updated_at = new Date();
      await user.update(updates, { transaction: t });
    }

    const currentRole = updates.role || user.role;

    if (currentRole === ROLES.PATIENT && user.patientProfile) {
      const patientFields = ["name", "phone", "gender", "dob", "medical_history"];
      const patientUpdates = {};
      for (const field of patientFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          patientUpdates[field] = req.body[field];
        }
      }
      if (Object.keys(patientUpdates).length) {
        await user.patientProfile.update(patientUpdates, { transaction: t });
      }
    }

    if (currentRole === ROLES.DOCTOR && user.doctorProfile) {
      const doctorFields = ["name", "specialization", "medical_certificate"];
      const doctorUpdates = {};
      for (const field of doctorFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          doctorUpdates[field] = req.body[field];
        }
      }

      if (req.body.verification_status) {
        doctorUpdates.verification_status = req.body.verification_status;
        doctorUpdates.is_verified = req.body.verification_status === VERIFICATION_STATUS.APPROVED;
        doctorUpdates.verified_at = new Date();
        doctorUpdates.verified_by = req.user.sub;
      } else if (Object.prototype.hasOwnProperty.call(req.body, "is_verified")) {
        doctorUpdates.is_verified = Boolean(req.body.is_verified);
        doctorUpdates.verification_status = req.body.is_verified
          ? VERIFICATION_STATUS.APPROVED
          : VERIFICATION_STATUS.PENDING;
        doctorUpdates.verified_at = req.body.is_verified ? new Date() : null;
        doctorUpdates.verified_by = req.body.is_verified ? req.user.sub : null;
      }

      if (Object.keys(doctorUpdates).length) {
        await user.doctorProfile.update(doctorUpdates, { transaction: t });
      }
    }

    await t.commit();
    const hydrated = await findManagedUser(req.params.id);
    return sendSuccess(res, {
      message: "User updated",
      data: { user: serializeManagedUser(hydrated) },
      legacy: { user: serializeManagedUser(hydrated) }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (id === Number(req.user.sub)) {
      return sendError(res, {
        statusCode: 400,
        message: "Admins cannot delete their own account",
        code: "VALIDATION_ERROR"
      });
    }

    const deleted = await User.destroy({ where: { id } });
    if (!deleted) {
      return sendError(res, { statusCode: 404, message: "User not found", code: "NOT_FOUND" });
    }

    return sendSuccess(res, {
      message: "User deleted",
      data: { id },
      legacy: { id }
    });
  } catch (err) {
    return next(err);
  }
}

async function getActivity(req, res, next) {
  try {
    const [totalUsers, patients, doctors, admins, pendingDoctors, xrays, recentUsers, recentMessages] =
      await Promise.all([
        User.count(),
        User.count({ where: { role: ROLES.PATIENT } }),
        User.count({ where: { role: ROLES.DOCTOR } }),
        User.count({ where: { role: ROLES.ADMIN } }),
        Doctor.count({ where: { verification_status: VERIFICATION_STATUS.PENDING } }),
        XrayImage.count(),
        User.findAll({
          include: [
            { model: Patient, as: "patientProfile" },
            { model: Doctor, as: "doctorProfile" }
          ],
          order: [["created_at", "DESC"]],
          limit: 8
        }),
        ChatMessage.findAll({
          include: [{ model: User, as: "sender", attributes: ["id", "email", "role"] }],
          order: [["created_at", "DESC"]],
          limit: 8
        })
      ]);

    return sendSuccess(res, {
      message: "Activity retrieved",
      data: {
        stats: { totalUsers, patients, doctors, admins, pendingDoctors, xrays },
        recent_users: recentUsers.map(serializeManagedUser),
        recent_messages: recentMessages.map((message) => ({
          id: message.id,
          body: message.body,
          sender_user_id: message.sender_user_id,
          sender_email: message.sender?.email || "",
          sender_role: message.sender?.role || "",
          created_at: message.created_at
        }))
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function listPendingDoctors(req, res, next) {
  try {
    const doctors = await Doctor.findAll({
      where: { verification_status: VERIFICATION_STATUS.PENDING },
      include: [{ model: User, as: "user", attributes: ["id", "email", "role", "created_at"] }],
      order: [["id", "ASC"]]
    });
    return sendSuccess(res, {
      statusCode: 200,
      message: "Pending doctors retrieved",
      data: { count: doctors.length, doctors },
      legacy: { count: doctors.length, doctors }
    });
  } catch (err) {
    return next(err);
  }
}

async function verifyDoctor(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action } = req.body; // validated by Joi

    const doctor = await Doctor.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!doctor) {
      await t.rollback();
      return sendError(res, { statusCode: 404, message: "Doctor not found", code: "NOT_FOUND" });
    }

    if (action === "approve") {
      doctor.is_verified = true;
      doctor.verification_status = VERIFICATION_STATUS.APPROVED;
    } else {
      doctor.is_verified = false;
      doctor.verification_status = VERIFICATION_STATUS.REJECTED;
    }
    doctor.verified_at = new Date();
    doctor.verified_by = req.user.sub;

    await doctor.save({ transaction: t });
    await t.commit();

    return sendSuccess(res, {
      statusCode: 200,
      message: `Doctor ${action}d successfully`,
      data: { doctor },
      legacy: { doctor }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getActivity,
  listPendingDoctors,
  verifyDoctor
};
