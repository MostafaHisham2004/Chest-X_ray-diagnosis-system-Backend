require("dotenv").config();
const fs = require("fs");
const path = require("path");
const app = require("./app");
const { sequelize } = require("./models");

const port = Number(process.env.PORT || 5000);
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
// eslint-disable-next-line no-console
console.log(`[DB] Using DB user: ${process.env.DB_USER}`);

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on :${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Startup failed", error);
    process.exit(1);
  }
}

start();
