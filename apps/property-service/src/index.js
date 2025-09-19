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
import "./controllers/property.controller.js";
import "./controllers/room.controller.js";
import "./controllers/staff.controller.js";
import "./controllers/log.controller.js"
import "./controllers/internal.controller.js";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["PROPERTY_MONGO_URI", "PROPERTY_PORT"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const app = express();
await connect();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  })
);
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
    await mongoose.connect(process.env.PROPERTY_MONGO_URI, {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const server = app.listen(process.env.PROPERTY_PORT, () => {
      console.log(
        `Property Service running on port ${process.env.PROPERTY_PORT}`
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
