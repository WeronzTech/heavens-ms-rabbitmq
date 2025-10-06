import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cron from "node-cron";

import { connect } from "../../../libs/common/rabbitMq.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generateMonthlySalaries } from "./utils/cronAutomation.js";
// ⛔️ REMOVED: Controller import is moved into the startup function.
// import "./controllers/feePayment.controller.js";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["ACCOUNTS_MONGO_URI", "ACCOUNTS_PORT"];
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

// Health check endpoint
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

cron.schedule(
  "0 0 * * *",
  () => {
    generateMonthlySalaries();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

// Global error handler
app.use(errorHandler);

const startServer = async () => {
  try {
    // ✅ STEP 1: Connect to RabbitMQ and wait for it to finish.
    console.log("[ACCOUNTS] Connecting to RabbitMQ...");
    await connect();
    console.log("[ACCOUNTS] RabbitMQ connection successful.");

    // ✅ STEP 2: Dynamically import controller AFTER the connection is ready.
    console.log("[ACCOUNTS] Setting up RabbitMQ responders...");
    await import("./controllers/feePayment.controller.js");
    await import("./controllers/expense.controller.js");
    await import("./controllers/commission.controller.js");
    await import("./controllers/dashboard.controller.js");
    await import("./controllers/staffSalaryHistory.controller.js");
    console.log("[ACCOUNTS] Responders are ready.");

    // ✅ STEP 3: Connect to your database.
    console.log("[ACCOUNTS] Connecting to MongoDB...");
    await mongoose.connect(process.env.ACCOUNTS_MONGO_URI);
    console.log("[ACCOUNTS] MongoDB connection successful.");

    // ✅ STEP 4: Start the HTTP server.
    const server = app.listen(process.env.ACCOUNTS_PORT, () => {
      console.log(
        `[ACCOUNTS] Service is fully started and running on port ${process.env.ACCOUNTS_PORT}`
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
