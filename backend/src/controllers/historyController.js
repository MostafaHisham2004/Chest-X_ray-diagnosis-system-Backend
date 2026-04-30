const { XrayImage, ResultImage, DiagnosisReport, Doctor, Patient } = require("../models");
const { sendError, sendSuccess } = require("../utils/response");

async function getPatientHistory(req, res, next) {
  try {
    const patientId = Number(req.params.id);

    // FIX: patients can only view their own history; doctors can view any patient's history
    if (req.user.role === "patient" && req.user.sub !== patientId) {
      return sendError(res, {
        statusCode: 403,
        message: "Access denied: you can only view your own history",
        code: "FORBIDDEN"
      });
    }

    const xrays = await XrayImage.findAll({
      where: { patient_id: patientId },
      include: [{ model: ResultImage }],
      order: [["upload_date", "DESC"]]
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Patient history retrieved",
      data: { patient_id: patientId, xrays },
      legacy: { patient_id: patientId, xrays }
    });
  } catch (error) {
    return next(error);
  }
}

async function getDoctorHistory(req, res, next) {
  try {
    const doctorId = req.user.sub;
    const reports = await DiagnosisReport.findAll({
      where: { doctor_id: doctorId },
      include: [Patient, Doctor, ResultImage],
      order: [["created_at", "DESC"]]
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Doctor history retrieved",
      data: { doctor_id: doctorId, reports },
      legacy: { doctor_id: doctorId, reports }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getPatientHistory, getDoctorHistory };