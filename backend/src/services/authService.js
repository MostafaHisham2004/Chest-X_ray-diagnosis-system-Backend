const bcrypt = require("bcrypt");
const { Doctor, Patient } = require("../models");
const { ASSIGNABLE_SELF_REGISTRATION_ROLE, ROLES } = require("../constants/roles");
const { normalizePhoneNumber } = require("./whatsappService");

async function registerUser(input) {
  const { password, role_type, ...payload } = input;
  const role = payload.role || role_type || ASSIGNABLE_SELF_REGISTRATION_ROLE;
  const phone = payload.phone ? normalizePhoneNumber(payload.phone) : null;
  const hashedPassword = await bcrypt.hash(password, 12);

  const [existingPatient, existingDoctor] = await Promise.all([
    Patient.findOne({ where: { email: payload.email } }),
    Doctor.findOne({ where: { email: payload.email } })
  ]);

  if (![ROLES.PATIENT, ROLES.DOCTOR].includes(role)) {
    const err = new Error("Invalid registration role");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (existingPatient || existingDoctor) {
    const err = new Error("Email already in use");
    err.statusCode = 409;
    err.code = "CONFLICT";
    throw err;
  }

  const created =
    role === ROLES.DOCTOR
      ? await Doctor.create({
          name: payload.name,
          email: payload.email,
          phone,
          password: hashedPassword,
          role: ROLES.DOCTOR,
          specialization: payload.specialization,
          medical_certificate: payload.medical_certificate
        })
      : await Patient.create({
          name: payload.name,
          email: payload.email,
          phone,
          password: hashedPassword,
          role: ROLES.PATIENT,
          gender: payload.gender,
          dob: payload.dob,
          medical_history: payload.medical_history
        });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    phone: created.phone,
    role: created.role
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

  const role = user.role || (user.specialization ? ROLES.DOCTOR : ROLES.PATIENT);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role
  };
}

module.exports = {
  registerUser,
  authenticateUser
};
