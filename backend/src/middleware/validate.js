const Joi = require("joi");
const { ROLES } = require("../constants/roles");

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

// Signup is patient only — no role field needed
const signupSchema = Joi.object({
  name: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  gender: Joi.string().min(1).required(),
  dob: Joi.string().min(1).required(),
  medical_history: Joi.string().allow(null, "").optional()
}).required();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
}).required();

const analyzeIdSchema = Joi.object({
  id: Joi.number().integer().positive().required()
}).required();

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
    patient_id: role === ROLES.DOCTOR ? patientIdSchema.required() : patientIdSchema.optional()
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
  analyzeIdSchema
};