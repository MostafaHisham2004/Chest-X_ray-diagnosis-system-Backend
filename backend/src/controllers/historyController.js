const { XrayImage, ResultImage, DiagnosisReport, Doctor, Patient } = require("../models");
const { sendSuccess } = require("../utils/response");

async function getPatientHistory(req, res, next) {
  try {
    const patientId = req.params.id;
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
