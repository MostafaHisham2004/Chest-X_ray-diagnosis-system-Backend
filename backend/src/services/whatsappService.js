class WhatsAppServiceError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = "WhatsAppServiceError";
    this.details = details;
  }
}

function normalizePhoneNumber(phoneNumber) {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return `20${digits.slice(1)}`;
  return digits;
}

function getEvolutionConfig() {
  return {
    apiUrl: (process.env.EVO_API_URL || "").replace(/\/+$/, ""),
    apiKey: process.env.EVO_API_KEY || "",
    instanceName: process.env.EVO_INSTANCE_NAME || ""
  };
}

async function sendTextMessage(phoneNumber, message) {
  const { apiUrl, apiKey, instanceName } = getEvolutionConfig();
  const number = normalizePhoneNumber(phoneNumber);
  const text = String(message || "").trim();

  if (!apiUrl || !apiKey || !instanceName) {
    throw new WhatsAppServiceError("Evolution API configuration is incomplete");
  }

  if (!number) {
    throw new WhatsAppServiceError("Recipient phone number is required");
  }

  if (!text) {
    throw new WhatsAppServiceError("Message text is required");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.EVO_API_TIMEOUT_MS || 10000));

  try {
    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey
      },
      body: JSON.stringify({
        number,
        options: {
          delay: 1200,
          presence: "composing"
        },
        text
      }),
      signal: controller.signal
    });

    const responseText = await response.text();
    let responseBody = null;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch (_error) {
        responseBody = responseText;
      }
    }

    if (!response.ok) {
      throw new WhatsAppServiceError(`Evolution API failed with status ${response.status}`, responseBody);
    }

    return responseBody;
  } catch (error) {
    if (error.name === "WhatsAppServiceError") throw error;
    if (error.name === "AbortError") {
      throw new WhatsAppServiceError("Evolution API request timed out");
    }
    throw new WhatsAppServiceError("Evolution API request failed", error.message || null);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendTextMessage,
  normalizePhoneNumber,
  WhatsAppServiceError
};
