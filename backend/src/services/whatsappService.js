const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const path = require("path");
const fs = require("fs");
const pino = require("pino");

const AUTH_DIR = path.resolve(process.cwd(), "auth_info");
fs.mkdirSync(AUTH_DIR, { recursive: true });

let sock = null;
let startPromise = null;
let reconnectTimer = null;

async function getSocket() {
  if (sock) return sock;

  if (!startPromise) {
    startPromise = (async () => {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
          console.log("\n[WhatsApp] QR Code received (non-pairing):");
          console.log(qr);
        }

        if (connection === "open") {
          console.log("[WhatsApp] Connected successfully!");
        }

        if (connection === "close") {
          const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
          sock = null;
          startPromise = null;

          if (reason === DisconnectReason.loggedOut) {
            console.log("[WhatsApp] Session logged out. Clearing stale auth credentials...");
            try {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
              fs.mkdirSync(AUTH_DIR, { recursive: true });
              console.log("[WhatsApp] Auth folder cleared. Restart to re-pair.");
            } catch (e) {
              console.log("[WhatsApp] Failed to clear auth folder:", e.message);
            }
            return;
          }

          // Guard against overlapping reconnect attempts
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }

          console.log("[WhatsApp] Disconnected. Reconnecting in 5s... (reason:", reason, ")");
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            getSocket();
          }, 5000);
        }
      });

      return sock;
    })();
  }
  return startPromise;
}

function isConnected() {
  return sock?.user != null;
}

async function sendOtp(phoneJid, code, doctorName) {

  const socket = await getSocket();
  const message = `MediScan AI: Your verification code from Dr. ${doctorName} is *${code}*. It expires in 5 minutes.`;

  await socket.sendMessage(phoneJid, { text: message });
  console.log(`[WhatsApp] OTP sent to ${phoneJid}`);
}

async function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    sock.end(undefined);
    sock = null;
    startPromise = null;
    console.log("[WhatsApp] Disconnected gracefully.");
  }
}

module.exports = { getSocket, isConnected, sendOtp, disconnect };
