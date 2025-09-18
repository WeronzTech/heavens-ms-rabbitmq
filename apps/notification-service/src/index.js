import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cron from "node-cron";
import helmet from "helmet";
import alertNotificationRoutes from "./routes/alertNotification.route.js";
import pushNotificationRoutes from "./routes/pushNotification.route.js";
import notificationRoutes from "./routes/notification.route.js";
import { dbConnect } from "./config/dbConnect.js";
import {
  deleteOldNotifications,
  notifyMealTimings,
  runFeeNotificationCron,
} from "./utils/automationCronJobs.js";
import { connect } from "../../../libs/common/rabbitMq.js";

import "./controllers/pushNotification.controller.js"
import "./controllers/notification.controller.js"
import "./controllers/alertNotification.controller.js"


dotenv.config();
dbConnect();
connect();
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
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  })
);
app.use(helmet());

// Routes

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

app.use("/api/v2/notification", notificationRoutes);
app.use("/api/v2/notification/alert-notification", alertNotificationRoutes);
app.use("/api/v2/notification/push-notification", pushNotificationRoutes);

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
    // await mongoose.connect(process.env.MONGO_URI, {
    // //   useNewUrlParser: true,
    // //   useUnifiedTopology: true,
    // });
    // console.log('Connected to MongoDB');

    app.listen(process.env.NOTIFICATION_PORT, () => {
      console.log(`Notification Service running on port ${process.env.NOTIFICATION_PORT}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Shutting down gracefully...");
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
