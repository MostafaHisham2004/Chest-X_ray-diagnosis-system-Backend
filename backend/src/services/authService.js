const bcrypt = require("bcrypt");
const { Doctor, Patient } = require("../models");
const { ASSIGNABLE_SELF_REGISTRATION_ROLE, ROLES } = require("../constants/roles");

async function registerPatient(input) {
  const { password, ...payload } = input;
  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await Patient.findOne({ where: { email: payload.email } });
  if (existing) {
    const err = new Error("Email already in use");
    err.statusCode = 409;
    err.code = "CONFLICT";
    throw err;
  }

  const created = await Patient.create({
    ...payload,
    password: hashedPassword,
    role: ASSIGNABLE_SELF_REGISTRATION_ROLE
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
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
    role
  };
}

module.exports = {
  registerPatient,
  authenticateUser
};
