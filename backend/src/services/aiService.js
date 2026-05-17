class AiServiceError extends Error {
  constructor({ message, code, statusCode = 502, details = null }) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function normalizeAiResponse(aiJson) {
  // Keep the same domain shape the controller expects.
  return {
    diagnosis_output: aiJson?.diagnosis_output ?? aiJson?.diagnosisOutput ?? {},
    heatmap_path: aiJson?.heatmap_path ?? aiJson?.heatmapPath ?? null,
    bounding_boxes: aiJson?.bounding_boxes ?? aiJson?.boundingBoxes ?? []
  };
}

async function requestAiAnalyze({ imagePath, signal }) {
  let response;
  try {
    response = await fetch(`${process.env.AI_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_path: imagePath }),
      signal
    });
  } catch (err) {
    // Aborted (timeout) errors are handled in analyzeXrayWithAI.
    throw new AiServiceError({
      message: "AI service network error",
      code: "AI_NETWORK_ERROR",
      details: err?.message || null
    });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new AiServiceError({
      message: `AI service failed: ${response.status}`,
      code: "AI_NON_2XX",
      statusCode: 502,
      details: { status: response.status, body: text }
    });
  }

  try {
    return await response.json();
  } catch (err) {
    throw new AiServiceError({
      message: "AI service returned invalid JSON",
      code: "AI_INVALID_RESPONSE",
      statusCode: 502,
      details: err?.message || null
    });
  }
}

async function analyzeXrayWithAI({ imagePath }) {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS || 10000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const aiJson = await requestAiAnalyze({ imagePath, signal: controller.signal });
    return normalizeAiResponse(aiJson);
  } catch (err) {
    // Timeout / abort
    if (err?.name === "AbortError") {
      throw new AiServiceError({
        message: "AI service timeout",
        code: "AI_TIMEOUT",
        statusCode: 504,
        details: { timeoutMs }
      });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { analyzeXrayWithAI };
