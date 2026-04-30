const ROLES = Object.freeze({
  PATIENT: "patient",
  DOCTOR: "doctor",
  ADMIN: "admin"
});

const ASSIGNABLE_SELF_REGISTRATION_ROLE = ROLES.PATIENT;

module.exports = {
  ROLES,
  ASSIGNABLE_SELF_REGISTRATION_ROLE
};
