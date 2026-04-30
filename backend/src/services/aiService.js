async function analyzeXrayWithAI({ imagePath }) {
  return {
    diagnosis_output: {
      status: "pending_manual_review",
      summary: "AI model is not configured. Returning placeholder result.",
      source_image: imagePath
    },
    heatmap_path: null,
    bounding_boxes: []
  };
}

module.exports = { analyzeXrayWithAI };
