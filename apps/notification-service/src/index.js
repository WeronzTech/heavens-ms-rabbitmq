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
import axios from "axios";
import emailService from "../../../libs/email/email.service.js";
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

// Socket service listens on 5006.
// const services = [
//   { name: "api-gateway", url: "http://api-gateway:8080/health" },
//   { name: "auth-service", url: "http://auth-service:8080/health" },
//   { name: "client-service", url: "http://client-service:8080/health" },
//   { name: "user-service", url: "http://user-service:8080/health" },
//   { name: "property-service", url: "http://property-service:8080/health" },
//   { name: "inventory-service", url: "http://inventory-service:8080/health" },
//   {
//     name: "notification-service",
//     url: "http://notification-service:8080/health",
//   },
//   { name: "accounts-service", url: "http://accounts-service:8080/health" },
//   { name: "socket-service", url: "http://socket-service:5006/health" }, // Note port 5006
// ];
const services = [
  { name: "api-gateway", url: "http://localhost:8080/health" },
  { name: "user-service", url: "http://localhost:5000/health" },
  { name: "auth-service", url: "http://localhost:5001/health" },
  { name: "client-service", url: "http://localhost:5002/health" },
  { name: "inventory-service", url: "http://localhost:5003/health" },
  { name: "property-service", url: "http://localhost:5004/health" },
  { name: "accounts-service", url: "http://localhost:5005/health" },
  { name: "socket-service", url: "http://localhost:5006/health" },
  { name: "notification-service", url: "http://localhost:5007/health" },
];

console.log("[Monitor Service] Started. Scheduling health checks...");

// Schedule task to run every minute
// Cron format: * * * * * (minute hour day-of-month month day-of-week)
const serviceStatus = new Map();

// Schedule task to run every minute
// Cron format: * * * * * (minute hour day-of-month month day-of-week)
cron.schedule("* * * * *", async () => {
  console.log(`\n[${new Date().toISOString()}] --- Starting Health Check ---`);

  const results = await Promise.allSettled(
    services.map(async (service) => {
      const start = Date.now();
      try {
        await axios.get(service.url, { timeout: 5000 }); // 5s timeout
        const duration = Date.now() - start;
        return { status: "UP", name: service.name, duration };
      } catch (error) {
        return {
          status: "DOWN",
          name: service.name,
          error: error.message,
        };
      }
    })
  );

  // Process results
  for (const result of results) {
    const val = result.value;
    const previousStatus = serviceStatus.get(val.name);

    if (val.status === "UP") {
      console.log(`✅ ${val.name} is UP (${val.duration}ms)`);

      // Update status map
      if (previousStatus === "DOWN") {
        console.log(`🎉 ${val.name} has recovered.`);
      }
      serviceStatus.set(val.name, "UP");
    } else {
      console.error(`❌ ${val.name} is DOWN: ${val.error}`);

      // Only send email if status CHANGED to DOWN (avoids spamming every minute)
      if (previousStatus !== "DOWN") {
        console.log(`📧 Sending alert email for ${val.name}...`);
        await emailService.sendServerDownEmail(val.name, val.error);
        serviceStatus.set(val.name, "DOWN");
      } else {
        console.log(
          `... ${val.name} is still down. Skipping email to avoid spam.`
        );
      }
    }
  }
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
