import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cron from "node-cron";

import { parseForwardedAuth } from "./utils/parseForwardAuth.js";
import { sendRentReminders } from "./utils/cronAutomation.js";
import { connect } from "../../../libs/common/rabbitMq.js";
// ⛔️ REMOVED: Controller imports are moved into the startup function.
// import "./controllers/user.controller.js";
// import "./controllers/reminderNote.controller.js";

dotenv.config();

const app = express();
// ⛔️ REMOVED: The connect() call is moved to ensure proper order.

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(helmet());
app.use(parseForwardedAuth);

// Cron Jobs
cron.schedule("0 18 * * *", sendRentReminders, {
  scheduled: true,
  timezone: "Asia/Kolkata",
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const startServer = async () => {
  try {
    // ✅ STEP 1: Connect to RabbitMQ and wait for it to finish.
    console.log("[USER] Connecting to RabbitMQ...");
    await connect();
    console.log("[USER] RabbitMQ connection successful.");

    // ✅ STEP 2: Dynamically import controllers AFTER the connection is ready.
    console.log("[USER] Setting up RabbitMQ responders...");
    await import("./controllers/user.controller.js");
    await import("./controllers/reminderNote.controller.js");
    await import("./controllers/referral.controller.js");
    await import("./controllers/userLog.controller.js");
    await import("./controllers/internal.controller.js");
    console.log("[USER] Responders are ready.");

    // ✅ STEP 3: Connect to your database.
    console.log("[USER] Connecting to MongoDB...");
    await mongoose.connect(process.env.USER_MONGO_URI);
    console.log("[USER] MongoDB connection successful.");

    // ✅ STEP 4: Start the HTTP server.
    const server = app.listen(process.env.USER_PORT, () => {
      console.log(
        `[USER] Service is fully started and running on port ${process.env.USER_PORT}`
      );
    });

    // Graceful shutdown logic remains the same.
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
