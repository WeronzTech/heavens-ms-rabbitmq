import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
// import cron from "node-cron";

import {connect} from "../../../libs/common/rabbitMq.js";
import { errorHandler } from "./middleware/errorHandler.js";
import "./controllers/feePayment.controller.js";


dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["ACCOUNTS_MONGO_URI", "ACCOUNTS_PORT"];
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


// cron.schedule(
//   "0 * * * *",
//   () => {
//     checkUnassignedMaintenance();
//   },
//   {
//     scheduled: true,
//     timezone: "Asia/Kolkata",
//   }
// );

// Health check endpoint
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

// Global error handler
app.use(errorHandler);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.ACCOUNTS_MONGO_URI, {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const server = app.listen(process.env.ACCOUNTS_PORT, () => {
      console.log(
        `Account Service running on port ${process.env.ACCOUNTS_PORT}`
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
