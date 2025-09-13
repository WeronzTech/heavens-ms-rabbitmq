import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cron from "node-cron";

import propertyRoutes from "./routes/property.routes.js";
import roomRoutes from "./routes/room.routes.js";
import maintenanceRoutes from "./routes/maintenance.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import logsRoutes from "./routes/propertyLog.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { checkUnassignedMaintenance } from "./utils/automation.js";
import { parseForwardedAuth } from "./utils/parseForwardAuth.js";
import {connect} from "../../../libs/common/rabbitMq.js"
import "./controllers/property.controller.js"

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["PROPERTY_MONGO_URI", "PROPERTY_PORT"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const app = express();
connect();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  })
);
app.use(helmet());
app.use(parseForwardedAuth);

// Routes
app.use("/api/v2/property", propertyRoutes);
app.use("/api/v2/property/room", roomRoutes);
app.use("/api/v2/property/maintenance", maintenanceRoutes);
app.use("/api/v2/property/staff", staffRoutes);
app.use("/api/v2/property/logs", logsRoutes);
app.use("/api/v2/property/dashboard", dashboardRoutes);

cron.schedule(
  "0 * * * *",
  () => {
    checkUnassignedMaintenance();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

// Health check endpoint
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

// Global error handler
app.use(errorHandler);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.PROPERTY_MONGO_URI, {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const server = app.listen(process.env.PROPERTY_PORT, () => {
      console.log(`Property Service running on port ${process.env.PROPERTY_PORT}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Shutting down gracefully...");
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log("Server closed. MongoDB connection closed.");
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
