import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import useragent from "express-useragent";

import authRoutes from "./routes/auth.routes.js";
import refreshRoutes from "./routes/refresh.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import roleRoutes from "./routes/role.routes.js";
import { connect } from "../../../libs/common/rabbitMq.js";
// ⛔️ REMOVED: Controller imports are moved into the startup function.
// import "./controllers/auth.controller.js";
// import "./controllers/roles.controller.js";

dotenv.config();

const app = express();
// ⛔️ REMOVED: The connect() call is moved to ensure proper order.

// Middleware
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(helmet());
app.use(useragent.express());

// Routes
app.use("/api/v2/auth", authRoutes);
app.use("/api/v2/auth", refreshRoutes);
app.use("/api/v2/auth/role", roleRoutes);
app.use("/api/v2/auth/internal", internalRoutes);

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
    console.log("[AUTH] Connecting to RabbitMQ...");
    await connect();
    console.log("[AUTH] RabbitMQ connection successful.");

    // ✅ STEP 2: Dynamically import controllers AFTER the connection is ready.
    // This executes the createResponder calls inside them at the correct time.
    console.log("[AUTH] Setting up RabbitMQ responders...");
    await import("./controllers/auth.controller.js");
    await import("./controllers/roles.controller.js");
    console.log("[AUTH] Responders are ready.");

    // ✅ STEP 3: Connect to your database.
    console.log("[AUTH] Connecting to MongoDB...");
    await mongoose.connect(process.env.AUTH_MONGO_URI);
    console.log("[AUTH] MongoDB connection successful.");

    // ✅ STEP 4: Start the HTTP server.
    const server = app.listen(process.env.AUTH_PORT, () => {
      console.log(
        `[AUTH] Service is fully started and running on port ${process.env.AUTH_PORT}`
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
