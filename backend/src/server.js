require("dotenv").config();
const fs = require("fs");
const path = require("path");
const app = require("./app");
const { sequelize } = require("./models");
const { ensureAuthSchema } = require("./config/migrateAdminColumn");

const port = Number(process.env.PORT || 5000);
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

async function start() {
  try {
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log("[DB] Connection established successfully.");
    await sequelize.sync();
    await ensureAuthSchema(sequelize);
    app.listen(port, "0.0.0.0", () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://0.0.0.0:${port} (LAN devices: use your laptop IP)`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Startup failed", error);
    process.exit(1);
  }
}

start();
