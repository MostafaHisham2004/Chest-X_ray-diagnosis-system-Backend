const { XrayImage, ResultImage } = require("../models");
const { analyzeXrayWithAI } = require("../services/aiService");
const { sendError, sendSuccess } = require("../utils/response");

async function uploadXray(req, res, next) {
  try {
    if (!req.file) {
      return sendError(res, { statusCode: 400, message: "X-ray file is required", code: "VALIDATION_ERROR" });
    }
    const { patient_id } = req.body;
    const doctorId = req.user.role === "doctor" ? req.user.sub : null;
    const effectivePatientId = req.user.role === "patient" ? req.user.sub : patient_id;

    if (!effectivePatientId) {
      return sendError(res, {
        statusCode: 400,
        message: "patient_id is required for doctor uploads",
        code: "VALIDATION_ERROR"
      });
    }

    const xray = await XrayImage.create({
      patient_id: effectivePatientId,
      doctor_id: doctorId,
      image_path: req.file.path
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Uploaded",
      data: { xray },
      legacy: { xray }
    });
  } catch (error) {
    return next(error);
  }
}

async function analyzeXray(req, res, next) {
  try {
    const xray = await XrayImage.findByPk(req.params.id);
    if (!xray) {
      return sendError(res, { statusCode: 404, message: "X-ray not found", code: "NOT_FOUND" });
    }

    const aiResult = await analyzeXrayWithAI({ imagePath: xray.image_path });
    const result = await ResultImage.create({
      xray_id: xray.id,
      diagnosis_output: aiResult.diagnosis_output || {},
      heatmap_path: aiResult.heatmap_path || null,
      bounding_boxes: aiResult.bounding_boxes || []
    });

    const resultPayload = {
      ...result.toJSON(),
      original_image_url: xray.image_path
    };

    return sendSuccess(res, {
      statusCode: 200,
      message: "Analysis complete",
      data: { result: resultPayload },
      legacy: { result: resultPayload }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { uploadXray, analyzeXray };
