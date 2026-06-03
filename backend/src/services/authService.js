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

async function authenticateUser({ email, password }) {
  let user = await Doctor.findOne({ where: { email } });
  if (!user) {
    user = await Patient.findOne({ where: { email } });
  }

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return null;
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
