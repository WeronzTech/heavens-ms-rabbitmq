import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

import userRoutes from "./routes/user.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import logRoutes from "./routes/userLog.routes.js";
import reminderNoteRoutes from "./routes/reminderNote.routes.js";
import { parseForwardedAuth } from "./utils/parseForwardAuth.js";
import { sendRentReminders } from "./utils/cronAutomation.js";
import cron from "node-cron";
import { connect } from "../../../libs/common/rabbitMq.js";
import "./controllers/user.controller.js";
// import { connect } from "./utils/rabbitMq.js";

dotenv.config();

// Validate required environment variables

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
app.use("/api/v2/user", userRoutes);
app.use("/api/v2/user/internal", internalRoutes);
app.use("/api/v2/user/userlogs", logRoutes);
app.use("/api/v2/user/reminderNotes", reminderNoteRoutes);

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
    await mongoose.connect(process.env.USER_MONGO_URI, {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const server = app.listen(process.env.USER_PORT, () => {
      console.log(`User Service running on port ${process.env.USER_PORT}`);
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
