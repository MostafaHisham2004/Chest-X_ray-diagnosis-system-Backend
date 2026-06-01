const bcrypt = require("bcrypt");
const { sequelize, User, Patient, Doctor, PatientDoctorConnection } = require("../models");
const { ROLES, VERIFICATION_STATUS } = require("../constants/roles");

const BCRYPT_ROUNDS = 12;

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function toAuthUser(user, profile = null) {
  const isDoctor = user.role === ROLES.DOCTOR;
  const isPatient = user.role === ROLES.PATIENT;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: profile?.name || (user.role === ROLES.ADMIN ? "Admin" : ""),
    profile_id: profile?.id || null,
    isAdmin: user.role === ROLES.ADMIN,
    phone: isPatient && profile ? (profile.phone || null) : null,
    gender: isPatient && profile ? (profile.gender || null) : null,
    dob: isPatient && profile ? (profile.dob || null) : null,
    medical_history: isPatient && profile ? (profile.medical_history || null) : null,
    verification_status: isDoctor ? profile?.verification_status || null : null,
    is_verified: isDoctor ? Boolean(profile?.is_verified) : null,
    specialization: isDoctor ? (profile?.specialization || null) : null,
    medical_certificate: isDoctor ? (profile?.medical_certificate || null) : null
  };
}

async function registerPatient({ email, password, name, phone, gender, dob, medical_history }) {
  return sequelize.transaction(async (t) => {
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ where: { email: normalizedEmail }, transaction: t });
    if (existing) {
      const err = new Error("Email already registered");
      err.statusCode = 409;
      err.code = "CONFLICT";
      throw err;
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create(
      { email: normalizedEmail, password: hashed, role: ROLES.PATIENT },
      { transaction: t }
    );
    const patient = await Patient.create(
      { user_id: user.id, name, phone, gender, dob, medical_history },
      { transaction: t }
    );

    return toAuthUser(user, patient);
  });
}

async function registerDoctor({
  email,
  password,
  name,
  specialization,
  medical_certificate
}) {
  return sequelize.transaction(async (t) => {
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ where: { email: normalizedEmail }, transaction: t });
    if (existing) {
      const err = new Error("Email already registered");
      err.statusCode = 409;
      err.code = "CONFLICT";
      throw err;
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create(
      { email: normalizedEmail, password: hashed, role: ROLES.DOCTOR },
      { transaction: t }
    );
    const doctor = await Doctor.create(
      {
        user_id: user.id,
        name,
        specialization,
        medical_certificate: medical_certificate || "Pending license review",
        is_verified: false,
        verification_status: VERIFICATION_STATUS.PENDING
      },
      { transaction: t }
    );

    return toAuthUser(user, doctor);
  });
}

async function authenticateUser({ email, password }) {
  const user = await User.scope("withPassword").findOne({
    where: { email: String(email).toLowerCase().trim() }
  });
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  if (user.role === ROLES.PATIENT) {
    const patient = await Patient.findOne({ where: { user_id: user.id } });
    return toAuthUser(user, patient);
  }

  if (user.role === ROLES.DOCTOR) {
    const doctor = await Doctor.findOne({ where: { user_id: user.id } });
    return toAuthUser(user, doctor);
  }

  return toAuthUser(user);
}

async function getCurrentUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  if (user.role === ROLES.PATIENT) {
    const patient = await Patient.findOne({ where: { user_id: user.id } });
    return toAuthUser(user, patient);
  }

  if (user.role === ROLES.DOCTOR) {
    const doctor = await Doctor.findOne({ where: { user_id: user.id } });
    return toAuthUser(user, doctor);
  }

  return toAuthUser(user);
}

async function updateCurrentUser(userId, updates) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const userUpdates = {};
  if (updates.email) userUpdates.email = updates.email;
  if (updates.password) userUpdates.password = await bcrypt.hash(updates.password, BCRYPT_ROUNDS);
  if (Object.keys(userUpdates).length) {
    userUpdates.updated_at = new Date();
    await user.update(userUpdates);
  }

  if (user.role === ROLES.PATIENT) {
    const patient = await Patient.findOne({ where: { user_id: user.id } });
    if (patient) {
      const patientFields = ["name", "phone", "gender", "dob", "medical_history"];
      const patientUpdates = {};
      for (const field of patientFields) {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
          patientUpdates[field] = updates[field];
        }
      }
      if (Object.keys(patientUpdates).length) {
        if (
          Object.prototype.hasOwnProperty.call(patientUpdates, "phone") &&
          patientUpdates.phone !== patient.phone
        ) {
          await PatientDoctorConnection.update(
            { status: "invalidated", updated_at: new Date() },
            { where: { patient_phone: normalizePhone(patient.phone), status: "pending" } }
          );
        }
        await patient.update(patientUpdates);
      }
    }
    return getCurrentUser(userId);
  }

  if (user.role === ROLES.DOCTOR) {
    const doctor = await Doctor.findOne({ where: { user_id: user.id } });
    if (doctor) {
      const doctorFields = ["name", "specialization", "medical_certificate"];
      const doctorUpdates = {};
      for (const field of doctorFields) {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
          doctorUpdates[field] = updates[field];
        }
      }
      if (Object.keys(doctorUpdates).length) {
        await doctor.update(doctorUpdates);
      }
    }
    return getCurrentUser(userId);
  }

  return getCurrentUser(userId);
}

async function deleteCurrentUser(userId, password) {
  const user = await User.scope("withPassword").findByPk(userId);
  if (!user) return false;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return false;

  await sequelize.transaction(async (t) => {
    if (user.role === ROLES.PATIENT) {
      await Patient.destroy({ where: { user_id: user.id }, transaction: t });
    }
    if (user.role === ROLES.DOCTOR) {
      await Doctor.destroy({ where: { user_id: user.id }, transaction: t });
    }
    await User.destroy({ where: { id: user.id }, transaction: t });
  });

  return true;
}

module.exports = {
  registerPatient,
  registerDoctor,
  authenticateUser,
  getCurrentUser,
  updateCurrentUser,
  deleteCurrentUser
};
