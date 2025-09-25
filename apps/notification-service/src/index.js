import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cron from "node-cron";
import helmet from "helmet";
import { dbConnect } from "./config/dbConnect.js";
import {
  deleteOldNotifications,
  notifyMealTimings,
  runFeeNotificationCron,
} from "./utils/automationCronJobs.js";
import { connect } from "../../../libs/common/rabbitMq.js";
// ⛔️ REMOVED: Controller imports are moved into the startup function.
// import "./controllers/pushNotification.controller.js";
// import "./controllers/notification.controller.js";
// import "./controllers/alertNotification.controller.js";

dotenv.config();

// ⛔️ REMOVED: dbConnect() and connect() moved into the startup function.

// Validate required environment variables
const requiredEnvVars = ["NOTIFICATION_PORT"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(helmet());

// Cron Jobs
cron.schedule(
  "30 5 * * *",
  () => {
    runFeeNotificationCron();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);
cron.schedule(
  "*/30 * * * *",
  () => {
    notifyMealTimings();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);
cron.schedule(
  "0 0 * * *",
  () => {
    deleteOldNotifications();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

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
    console.log("[NOTIFICATION] Connecting to RabbitMQ...");
    await connect();
    console.log("[NOTIFICATION] RabbitMQ connection successful.");

    // ✅ STEP 2: Dynamically import controllers AFTER the connection is ready.
    console.log("[NOTIFICATION] Setting up RabbitMQ responders...");
    await import("./controllers/pushNotification.controller.js");
    await import("./controllers/notification.controller.js");
    await import("./controllers/alertNotification.controller.js");
    console.log("[NOTIFICATION] Responders are ready.");

    // ✅ STEP 3: Connect to your database.
    console.log("[NOTIFICATION] Connecting to Database...");
    await dbConnect();
    console.log("[NOTIFICATION] Database connection successful.");

    // ✅ STEP 4: Start the HTTP server.
    const server = app.listen(process.env.NOTIFICATION_PORT, () => {
      console.log(
        `[NOTIFICATION] Service is fully started and running on port ${process.env.NOTIFICATION_PORT}`
      );
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Shutting down gracefully...");
      server.close(() => {
        console.log("Server closed.");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
