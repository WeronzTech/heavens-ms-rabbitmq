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
  deleteOldMealBookings,
  updateInventoryFromBookings,
} from "./utils/automation.js";
import { connect } from "../../../libs/common/rabbitMq.js";
// ⛔️ REMOVED: Controller imports are moved into the startup function.
// import "./controllers/messMenu.controller.js";
// import "./controllers/mealBooking.controller.js";
// import "./controllers/kitchen.controller.js";
// import "./controllers/inventoryLog.controller.js";
// import "./controllers/inventory.controller.js";
// import "./controllers/internal.controller.js";
// import "./controllers/category.controller.js";
// import "./controllers/addonBooking.controller.js";
// import "./controllers/addon.controller.js";

dotenv.config();

const app = express();
// ⛔️ REMOVED: The connect() call is moved to ensure proper order.

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(helmet());
app.use(parseForwardedAuth);

// Cron Jobs
cron.schedule("0 * * * *", () => {
  autoApplyQueuedInventory();
  checkLowStockAndNotify();
});

cron.schedule(
  "0 0 * * *",
  () => {
    updateInventoryFromBookings();
    deleteOldMealBookings();
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
    console.log("[INVENTORY] Connecting to RabbitMQ...");
    await connect();
    console.log("[INVENTORY] RabbitMQ connection successful.");

    // ✅ STEP 2: Dynamically import controllers AFTER the connection is ready.
    console.log("[INVENTORY] Setting up RabbitMQ responders...");
    await import("./controllers/messMenu.controller.js");
    await import("./controllers/mealBooking.controller.js");
    await import("./controllers/kitchen.controller.js");
    await import("./controllers/inventoryLog.controller.js");
    await import("./controllers/inventory.controller.js");
    await import("./controllers/internal.controller.js");
    await import("./controllers/category.controller.js");
    await import("./controllers/addonBooking.controller.js");
    await import("./controllers/addon.controller.js");
    await import("./controllers/dailyInventoryRequirement.controller.js");
    console.log("[INVENTORY] Responders are ready.");

    // ✅ STEP 3: Connect to your database.
    console.log("[INVENTORY] Connecting to MongoDB...");
    await mongoose.connect(process.env.INVENTORY_MONGO_URI);
    console.log("[INVENTORY] MongoDB connection successful.");

    // ✅ STEP 4: Start the HTTP server.
    const server = app.listen(process.env.INVENTORY_PORT, () => {
      console.log(
        `[INVENTORY] Service is fully started and running on port ${process.env.INVENTORY_PORT}`
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
