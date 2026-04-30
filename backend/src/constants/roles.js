const ROLES = Object.freeze({

  ADMIN: "admin",
  DOCTOR: "doctor",
  PATIENT: "patient"
});

const ALL_ROLES = Object.values(ROLES);

const VERIFICATION_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"

});

const ASSIGNABLE_SELF_REGISTRATION_ROLE = ROLES.PATIENT;

module.exports = {
  ROLES,

  ALL_ROLES,
  VERIFICATION_STATUS,
};
