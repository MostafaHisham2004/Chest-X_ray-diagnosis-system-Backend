const { Op } = require("sequelize");
const { XrayImage, ResultImage, DiagnosisReport, Doctor, Patient, User, ChatThread } = require("../models");
const { sendSuccess, sendError } = require("../utils/response");

function serializeResultImage(resultImage) {
  if (!resultImage) return null;
  const json = typeof resultImage.toJSON === "function" ? resultImage.toJSON() : resultImage;
  return {
    id: json.id,
    xray_id: json.xray_id,
    diagnosis_output: json.diagnosis_output || null,
    heatmap_path: json.heatmap_path || null,
    bounding_boxes: json.bounding_boxes || []
  };
}

function serializePatient(patient) {
  if (!patient) return null;
  const json = typeof patient.toJSON === "function" ? patient.toJSON() : patient;
  return {
    id: json.id,
    name: json.name,
    email: json.email,
    phone: json.phone || null,
    gender: json.gender,
    dob: json.dob,
    role: json.role || "patient",
    is_verified: json.is_verified || false,
    verification_status: json.verification_status || "pending"
  };
}

function serializeXray(xray) {
  const json = typeof xray.toJSON === "function" ? xray.toJSON() : xray;
  return {
    id: json.id,
    patient_id: json.patient_id,
    doctor_id: json.doctor_id,
    image_path: json.image_path,
    upload_date: json.upload_date,
    result_image: serializeResultImage(json.ResultImage || json.result_image),
    patient: serializePatient(json.Patient || json.patient)
  };
}

async function findPatientXrays(patientId) {
  return XrayImage.findAll({
    where: { patient_id: patientId },
    include: [{ model: ResultImage }],
    order: [["upload_date", "DESC"]]
  });
}

async function getMyXrays(req, res, next) {
  try {
    const patientId = req.user.sub;
    const xrays = await findPatientXrays(patientId);
    const serialized = xrays.map(serializeXray);

    return sendSuccess(res, {
      statusCode: 200,
      message: "X-ray history retrieved",
      data: { xrays: serialized },
      legacy: { xrays: serialized }
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyStats(req, res, next) {
  try {
    const patientId = req.user.sub;
    const xrays = await findPatientXrays(patientId);
    const serialized = xrays.map(serializeXray);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Patient stats retrieved",
      data: {
        xrayCount: serialized.length,
        latestXray: serialized[0] || null
      },
      legacy: {
        xrayCount: serialized.length,
        latestXray: serialized[0] || null
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getDoctorStats(req, res, next) {
  try {
    const doctorId = req.user.sub;
    const [xrays, totalReports] = await Promise.all([
      XrayImage.findAll({
        where: { doctor_id: doctorId },
        include: [{ model: ResultImage }, { model: Patient }],
        order: [["upload_date", "DESC"]]
      }),
      DiagnosisReport.count({ where: { doctor_id: doctorId } })
    ]);
    const serialized = xrays.map(serializeXray);
    const pendingCount = serialized.filter((xray) => !xray.result_image).length;

    return sendSuccess(res, {
      statusCode: 200,
      message: "Doctor stats retrieved",
      data: {
        totalAnalyses: serialized.length,
        pendingCount,
        totalReports,
        recentXrays: serialized.slice(0, 5)
      },
      legacy: {
        totalAnalyses: serialized.length,
        pendingCount,
        totalReports,
        recentXrays: serialized.slice(0, 5)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getDoctorPatients(req, res, next) {
  try {
    const doctorId = req.user.sub;
    const xrays = await XrayImage.findAll({
      where: { doctor_id: doctorId },
      include: [{ model: Patient }],
      order: [["upload_date", "DESC"]]
    });

    const patientsById = new Map();
    xrays.forEach((xray) => {
      const json = typeof xray.toJSON === "function" ? xray.toJSON() : xray;
      const patient = serializePatient(json.Patient || json.patient);
      if (patient && !patientsById.has(patient.id)) {
        patientsById.set(patient.id, {
          ...patient,
          last_xray_date: json.upload_date
        });
      }
    });

    const patients = Array.from(patientsById.values());

    return sendSuccess(res, {
      statusCode: 200,
      message: "Doctor patients retrieved",
      data: { patients },
      legacy: { patients }
    });
  } catch (error) {
    return next(error);
  }
}

async function getPatientHistory(req, res, next) {
  try {
    const patientId = req.params.id;
    const xrays = await findPatientXrays(patientId);
    const serialized = xrays.map(serializeXray);
    return sendSuccess(res, {
      statusCode: 200,
      message: "Patient history retrieved",
      data: { patient_id: patientId, xrays: serialized },
      legacy: { patient_id: patientId, xrays: serialized }

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
  getMyXrays,
  getMyStats,
  getDoctorStats,
  getDoctorPatients,
  getPatientHistory,
  getDoctorHistory

};
