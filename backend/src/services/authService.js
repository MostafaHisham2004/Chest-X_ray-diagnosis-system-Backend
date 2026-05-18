const bcrypt = require("bcrypt");
const { sequelize, User, Patient, Doctor } = require("../models");
const { ROLES, VERIFICATION_STATUS } = require("../constants/roles");

const BCRYPT_ROUNDS = 12;

function toAuthUser(user, profile = null) {
  const isDoctor = user.role === ROLES.DOCTOR;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: profile?.name || (user.role === ROLES.ADMIN ? "Admin" : ""),
    profile_id: profile?.id || null,
    isAdmin: user.role === ROLES.ADMIN,
    verification_status: isDoctor ? profile?.verification_status || null : null,
    is_verified: isDoctor ? Boolean(profile?.is_verified) : null
  };
}

async function registerPatient({ email, password, name, gender, dob, medical_history }) {
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
      { user_id: user.id, name, gender, dob, medical_history },
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
        medical_certificate,
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

module.exports = { registerPatient, registerDoctor, authenticateUser, getCurrentUser };
