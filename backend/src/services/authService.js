const bcrypt = require("bcrypt");
const { sequelize, User, Patient, Doctor } = require("../models");
const { ROLES, VERIFICATION_STATUS } = require("../constants/roles");

const BCRYPT_ROUNDS = 12;

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

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: patient.name,
      profile_id: patient.id
    };
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

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: doctor.name,
      profile_id: doctor.id,
      verification_status: doctor.verification_status,
      is_verified: doctor.is_verified
    };
  });
}

async function authenticateUser({ email, password }) {
  const user = await User.scope("withPassword").findOne({
    where: { email: String(email).toLowerCase().trim() }
  });
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  let name = null;
  let profile_id = null;
  let verification_status = null;
  let is_verified = null;

  if (user.role === ROLES.PATIENT) {
    const p = await Patient.findOne({ where: { user_id: user.id } });
    if (p) {
      name = p.name;
      profile_id = p.id;
    }
  } else if (user.role === ROLES.DOCTOR) {
    const d = await Doctor.findOne({ where: { user_id: user.id } });
    if (d) {
      name = d.name;
      profile_id = d.id;
      verification_status = d.verification_status;
      is_verified = d.is_verified;
    }
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name,
    profile_id,
    verification_status,
    is_verified
  };
}

module.exports = { registerPatient, registerDoctor, authenticateUser };
