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
import "./controllers/auth.controller.js";
import "./controllers/roles.controller.js";

dotenv.config();

// Validate required environment variables

const app = express();
connect();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);
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
    await mongoose.connect(process.env.AUTH_MONGO_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const server = app.listen(process.env.AUTH_PORT, () => {
      console.log(`Auth Service running on port ${process.env.AUTH_PORT}`);
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
