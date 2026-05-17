require("dotenv").config();
const { Sequelize } = require("sequelize");

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 5432);
const dbLoggingEnabled = process.env.DB_LOGGING === "true";

// eslint-disable-next-line no-console
console.log(
  `[DB] Initializing PostgreSQL connection: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
);

const sequelize = new Sequelize(
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  {
    host: DB_HOST,
    port: DB_PORT,
    dialect: "postgres",
    logging: dbLoggingEnabled ? (message) => console.log(`[Sequelize] ${message}`) : false
  }
);

module.exports = sequelize;
