import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cron from "node-cron";

import { errorHandler } from "./middleware/errorHandler.js";
import { checkUnassignedMaintenance } from "./utils/automation.js";
import { parseForwardedAuth } from "./utils/parseForwardAuth.js";
import { connect } from "../../../libs/common/rabbitMq.js";
// ⛔️ REMOVED: Controller imports are moved into the startup function.
// import "./controllers/property.controller.js";
// import "./controllers/room.controller.js";
// import "./controllers/staff.controller.js";
// import "./controllers/log.controller.js";
// import "./controllers/internal.controller.js";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["PROPERTY_MONGO_URI", "PROPERTY_PORT"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const app = express();
// ⛔️ REMOVED: The connect() call is moved to ensure proper order.

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(helmet());
app.use(parseForwardedAuth);

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
    // ✅ STEP 1: Connect to RabbitMQ and wait for it to finish.
    console.log("[PROPERTY] Connecting to RabbitMQ...");
    await connect();
    console.log("[PROPERTY] RabbitMQ connection successful.");

    // ✅ STEP 2: Dynamically import controllers AFTER the connection is ready.
    console.log("[PROPERTY] Setting up RabbitMQ responders...");
    await import("./controllers/property.controller.js");
    await import("./controllers/room.controller.js");
    await import("./controllers/staff.controller.js");
    await import("./controllers/floor.controller.js");
    await import("./controllers/asset.controller.js");
    await import("./controllers/log.controller.js");
    await import("./controllers/internal.controller.js");
    await import("./controllers/dashboard.controller.js");
    await import("./controllers/maintenance.controller.js");
    await import("./controllers/attendance.controller.js");
    await import("./controllers/carousal.controller.js");
    await import("./controllers/website.controller.js");
    console.log("[PROPERTY] Responders are ready.");

    // ✅ STEP 3: Connect to your database.
    console.log("[PROPERTY] Connecting to MongoDB...");
    await mongoose.connect(process.env.PROPERTY_MONGO_URI);
    console.log("[PROPERTY] MongoDB connection successful.");

    // ✅ STEP 4: Start the HTTP server.
    const server = app.listen(process.env.PROPERTY_PORT, () => {
      console.log(
        `[PROPERTY] Service is fully started and running on port ${process.env.PROPERTY_PORT}`
      );
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
