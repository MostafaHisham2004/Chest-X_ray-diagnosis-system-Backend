const Joi = require("joi");

function validateBody(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });

    if (error) {
      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";
      error.message = error.details?.[0]?.message || "Validation error";
      return next(error);
    }

    req.body = value;
    return next();
  };
}

function validateParams(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";
      error.message = error.details?.[0]?.message || "Validation error";
      return next(error);
    }

    req.params = value;
    return next();
  };
}

// Signup is patient only; no role field needed.
const signupSchema = Joi.object({
  name: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().min(6).max(64).optional(),
  gender: Joi.string().min(1).required(),
  dob: Joi.string().min(1).required(),
  role: Joi.string().valid("patient", "doctor").optional(),
  specialization: Joi.string().optional(),
  medical_certificate: Joi.string().allow(null, "").optional(),
  medical_history: Joi.string().allow(null, "").optional()
}).required();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
}).required();

const analyzeIdSchema = Joi.object({
  id: Joi.number().integer().positive().required()
}).required();

const verifyDoctorSchema = Joi.object({
  action: Joi.string().valid("approve", "reject").required()
}).required();

const chatThreadSchema = Joi.object({
  user_id: Joi.number().integer().positive().required()
}).required();

const chatMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(4000).required()
}).required();

const connectionRequestSchema = Joi.object({
  phone: Joi.string().min(6).max(64).required()
}).required();

const connectionVerifySchema = Joi.object({
  code: Joi.string().trim().length(6).required()
}).required();

const adminCreateUserSchema = Joi.object({
  role: Joi.string().valid("admin", "doctor", "patient").required(),
  name: Joi.when("role", {
    is: "admin",
    then: Joi.string().allow("", null).optional(),
    otherwise: Joi.string().min(1).required()
  }),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  gender: Joi.when("role", {
    is: "patient",
    then: Joi.string().min(1).default("other"),
    otherwise: Joi.string().allow("", null).optional()
  }),
  dob: Joi.when("role", {
    is: "patient",
    then: Joi.string().min(1).default("1970-01-01"),
    otherwise: Joi.string().allow("", null).optional()
  }),
  medical_history: Joi.string().allow(null, "").optional(),
  phone: Joi.string().min(6).max(64).optional(),
  specialization: Joi.when("role", {
    is: "doctor",
    then: Joi.string().min(1).default("Radiology"),
    otherwise: Joi.string().allow("", null).optional()
  }),
  medical_certificate: Joi.when("role", {
    is: "doctor",
    then: Joi.string().min(1).default("Pending certificate upload"),
    otherwise: Joi.string().allow("", null).optional()
  }),
  verification_status: Joi.string().valid("pending", "approved", "rejected").optional()
}).required();

const adminUpdateUserSchema = Joi.object({
  name: Joi.string().min(1).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(8).optional(),
  role: Joi.string().valid("admin", "doctor", "patient").optional(),
  gender: Joi.string().min(1).optional(),
  dob: Joi.string().min(1).optional(),
  medical_history: Joi.string().allow(null, "").optional(),
  phone: Joi.string().min(6).max(64).optional(),
  specialization: Joi.string().min(1).optional(),
  medical_certificate: Joi.string().min(1).optional(),
  verification_status: Joi.string().valid("pending", "approved", "rejected").optional(),
  is_verified: Joi.boolean().optional()
})
  .min(1)
  .required();

function validateXrayUpload(req, _res, next) {
  if (!req.file) {
    const err = new Error("X-ray file is required");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    return next(err);
  }

  const role = req.user?.role;
  const patientIdSchema = Joi.number().integer().positive();
  const schema = Joi.object({
    patient_id: role === "doctor" ? patientIdSchema.required() : patientIdSchema.optional()
  }).required();

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.message = error.details?.[0]?.message || "Validation error";
    return next(error);
  }

  req.body = value;
  return next();
}

module.exports = {
  validateBody,
  validateParams,
  validateXrayUpload,
  signupSchema,
  loginSchema,
  analyzeIdSchema,
  verifyDoctorSchema,
  chatThreadSchema,
  chatMessageSchema,
  connectionRequestSchema,
  connectionVerifySchema,
  adminCreateUserSchema,
  adminUpdateUserSchema
};
