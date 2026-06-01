const { Op } = require("sequelize");
const { XrayImage, ResultImage, DiagnosisReport, Doctor, Patient, User, ChatThread } = require("../models");
const { sendSuccess, sendError } = require("../utils/response");

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
      data: { xrays },
      legacy: { xrays }
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyXrays(req, res, next) {
  try {
    const profileId = req.user.profileId;
    if (!profileId) {
      return sendError(res, { statusCode: 400, message: "Patient profile not found", code: "BAD_REQUEST" });
    }
    const xrays = await XrayImage.findAll({
      where: { patient_id: profileId },
      include: [{ model: ResultImage }],
      order: [["upload_date", "DESC"]]
    });
    return sendSuccess(res, {
      statusCode: 200,
      message: "My X-rays retrieved",
      data: { xrays },
      legacy: { xrays }
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyStats(req, res, next) {
  try {
    const profileId = req.user.profileId;
    const userId = req.user.sub;
    if (!profileId || !userId) {
      return sendError(res, { statusCode: 400, message: "Profile not found", code: "BAD_REQUEST" });
    }

    const xrayCount = await XrayImage.count({ where: { patient_id: profileId } });
    const latestXray = await XrayImage.findOne({
      where: { patient_id: profileId },
      include: [{ model: ResultImage }],
      order: [["upload_date", "DESC"]]
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Stats retrieved",
      data: {
        xrayCount,
        latestXray: latestXray || null
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getDoctorHistory(req, res, next) {
  try {
    const doctorProfileId = req.user.profileId;
    const reports = await DiagnosisReport.findAll({
      where: { doctor_id: doctorProfileId },
      include: [Patient, Doctor, ResultImage],
      order: [["created_at", "DESC"]]
    });
    return sendSuccess(res, {
      statusCode: 200,
      message: "Doctor history retrieved",
      data: { reports },
      legacy: { reports }
    });
  } catch (error) {
    return next(error);
  }
}

async function getDoctorStats(req, res, next) {
  try {
    const doctorProfileId = req.user.profileId;
    const totalAnalyses = await XrayImage.count({ where: { doctor_id: doctorProfileId } });
    const totalReports = await DiagnosisReport.count({ where: { doctor_id: doctorProfileId } });

    const recentXrays = await XrayImage.findAll({
      where: { doctor_id: doctorProfileId },
      include: [
        { model: ResultImage },
        { model: Patient }
      ],
      order: [["upload_date", "DESC"]],
      limit: 5
    });

    const pendingCount = await XrayImage.count({
      where: { doctor_id: doctorProfileId, '$ResultImage.id$': null },
      include: [{ model: ResultImage, required: false }]
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Doctor stats retrieved",
      data: {
        totalAnalyses,
        totalReports,
        pendingCount,
        recentXrays
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getDoctorPatients(req, res, next) {
  try {
    const doctorProfileId = req.user.profileId;
    const threads = await ChatThread.findAll({
      where: { doctor_id: doctorProfileId },
      include: [{ model: Patient, as: "patient", include: [{ model: User, as: "user", attributes: ["id", "email"] }] }]
    });
    const xrays = await XrayImage.findAll({
      where: { doctor_id: doctorProfileId },
      include: [
        { model: Patient, include: [{ model: User, as: "user", attributes: ["id", "email"] }] },
        { model: ResultImage }
      ],
      order: [["upload_date", "DESC"]]
    });

    const patientMap = {};
    for (const thread of threads) {
      if (!thread.patient) continue;
      patientMap[thread.patient.id] = {
        id: thread.patient.id,
        name: thread.patient.name,
        email: thread.patient.user?.email || "",
        phone: thread.patient.phone || "",
        gender: thread.patient.gender,
        dob: thread.patient.dob,
        medical_history: thread.patient.medical_history,
        latestDiagnosis: null,
        latestDate: "",
        status: "connected"
      };
    }

    for (const xray of xrays) {
      if (!xray.patient) continue;
      const pid = xray.patient.id;
      if (!patientMap[pid]) {
        patientMap[pid] = {
          id: pid,
          name: xray.patient.name,
          email: xray.patient.user?.email || "",
          phone: xray.patient.phone || "",
          gender: xray.patient.gender,
          dob: xray.patient.dob,
          medical_history: xray.patient.medical_history,
          latestDiagnosis: xray.result_image?.diagnosis_output || null,
          latestDate: xray.upload_date,
          status: xray.result_image ? "completed" : "pending"
        };
      } else if (!patientMap[pid].latestDate) {
        patientMap[pid].latestDiagnosis = xray.result_image?.diagnosis_output || null;
        patientMap[pid].latestDate = xray.upload_date;
        patientMap[pid].status = xray.result_image ? "completed" : "pending";
      }
    }

    const patients = Object.values(patientMap);
    return sendSuccess(res, {
      statusCode: 200,
      message: "Doctor patients retrieved",
      data: { patients }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPatientHistory,
  getMyXrays,
  getMyStats,
  getDoctorHistory,
  getDoctorStats,
  getDoctorPatients
};
