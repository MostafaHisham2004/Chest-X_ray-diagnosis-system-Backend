const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

// FIX: paths corrected to match actual folder structure (routes/ middleware/)
const authRoutes = require("./routes/authRoutes");
const xrayRoutes = require("./routes/xrayRoutes");
const historyRoutes = require("./routes/historyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: process.env.CORS_ORIGIN ? true : false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads"))
);

app.get("/", (_req, res) =>
  res.status(200).json({
    message: "Medical Imaging Backend API is running",
    health: "/health"
  })
);
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", authRoutes);
app.use("/api/xray", xrayRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/admin", adminRoutes);
app.use(errorMiddleware);

module.exports = app;