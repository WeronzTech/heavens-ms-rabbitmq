import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cron from "node-cron";
import { parseForwardedAuth } from "./utils/parseForwardAuth.js";
import {
  autoApplyQueuedInventory,
  checkLowStockAndNotify,
  updateInventoryFromBookings,
} from "./utils/automation.js";
import { connect } from "../../../libs/common/rabbitMq.js";
import "./controllers/messMenu.controller.js";
import "./controllers/mealBooking.controller.js";
import "./controllers/kitchen.controller.js";
import "./controllers/inventoryLog.controller.js";
import "./controllers/inventory.controller.js";
import "./controllers/internal.controller.js";
import "./controllers/category.controller.js";
import "./controllers/addonBooking.controller.js";
import "./controllers/addon.controller.js";

dotenv.config();

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
cron.schedule("0 * * * *", () => {
  autoApplyQueuedInventory();
  checkLowStockAndNotify();
});

cron.schedule(
  "0 0 * * *",
  () => {
    updateInventoryFromBookings();
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
    await mongoose.connect(process.env.INVENTORY_MONGO_URI, {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const server = app.listen(process.env.INVENTORY_PORT, () => {
      console.log(
        `Inventory Service running on port ${process.env.INVENTORY_PORT}`
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
