const { XrayImage, ResultImage, DiagnosisReport, Doctor, Patient } = require("../models");
const { sendSuccess } = require("../utils/response");

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

module.exports = {
  getMyXrays,
  getMyStats,
  getDoctorStats,
  getDoctorPatients,
  getPatientHistory,
  getDoctorHistory
};
