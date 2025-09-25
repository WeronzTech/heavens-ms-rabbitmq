import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { connect } from "../../../libs/common/rabbitMq.js";
import "./controllers/client.controller.js";
import "./controllers/manager.controller.js";
import "./controllers/pettyCash.controller.js"

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
    await mongoose.connect(process.env.CLIENT_MONGO_URI, {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const server = app.listen(process.env.CLIENT_PORT, () => {
      console.log(`Client Service running on port ${process.env.CLIENT_PORT}`);
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
