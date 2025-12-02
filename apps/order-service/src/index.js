import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cron from "node-cron";
import helmet from "helmet";
import { parseForwardedAuth } from "./utils/parseForwardAuth.js";
import { connect } from "../../../libs/common/rabbitMq.js";
import { generateDailyReport } from "./utils/cronAutomation.js";
dotenv.config();

const app = express();
// ⛔️ REMOVED: The connect() call is moved to ensure proper order.

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(helmet());
app.use(parseForwardedAuth);

// Cron Jobs

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

cron.schedule(
  "0 0 * * *",
  () => {
    console.log("🕛 Running Midnight Cron: Generating Daily Sales Report...");
    generateDailyReport();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata", // CHANGE THIS to your server's timezone
  }
);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const startServer = async () => {
  try {
    // ✅ STEP 1: Connect to RabbitMQ and wait for it to finish.
    console.log("[ORDER] Connecting to RabbitMQ...");
    await connect();
    console.log("[ORDER] RabbitMQ connection successful.");

    // ✅ STEP 2: Dynamically import controllers AFTER the connection is ready.
    console.log("[ORDER] Setting up RabbitMQ responders...");
    // ... inside startServer function ....
    await import("./controllers/merchant.controller.js");
    await import("./controllers/shopOwner.controller.js");
    await import("./controllers/businessCategory.controller.js");
    await import("./controllers/merchantDiscount.controller.js");
    await import("./controllers/productDiscount.controller.js");
    await import("./controllers/productCategory.controller.js");
    await import("./controllers/product.controller.js");
    await import("./controllers/order.controller.js");
    await import("./controllers/dailySalesReport.controller.js");
    console.log("[ORDER] Responders are ready.");

    // ✅ STEP 3: Connect to your database.
    console.log("[ORDER] Connecting to MongoDB...");
    await mongoose.connect(process.env.ORDER_MONGO_URI);
    console.log("[ORDER] MongoDB connection successful.");

    // ✅ STEP 4: Start the HTTP server.
    const server = app.listen(process.env.ORDER_PORT, () => {
      console.log(
        `[ORDER] Service is fully started and running on port ${process.env.ORDER_PORT}`
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
