import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { connect } from "../../../libs/common/rabbitMq.js";
// ⛔️ REMOVED: Controller imports are moved into the startup function.
// import "./controllers/client.controller.js";
// import "./controllers/manager.controller.js";

dotenv.config();

const app = express();
// ⛔️ REMOVED: The connect() call is moved to ensure proper order.

// Middleware
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(helmet());

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
    console.log("[CLIENT] Connecting to RabbitMQ...");
    await connect();
    console.log("[CLIENT] RabbitMQ connection successful.");

    // ✅ STEP 2: Dynamically import controllers AFTER the connection is ready.
    // This executes the createResponder calls inside them at the correct time.
    console.log("[CLIENT] Setting up RabbitMQ responders...");
    await import("./controllers/client.controller.js");
    await import("./controllers/manager.controller.js");
    await import ("./controllers/pettyCash.controller.js");
    console.log("[CLIENT] Responders are ready.");

    // ✅ STEP 3: Connect to your database.
    console.log("[CLIENT] Connecting to MongoDB...");
    await mongoose.connect(process.env.CLIENT_MONGO_URI);
    console.log("[CLIENT] MongoDB connection successful.");

    // ✅ STEP 4: Start the HTTP server.
    const server = app.listen(process.env.CLIENT_PORT, () => {
      console.log(
        `[CLIENT] Service is fully started and running on port ${process.env.CLIENT_PORT}`
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
