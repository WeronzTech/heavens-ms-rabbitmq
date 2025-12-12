import http from "http";
import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

import { initializeSocketEvents } from "./services/socket.handler.js";
import { verifyToken } from "./utils/verifyToken.js";
import { dbConnect } from "./config/dbConnect.js";
import { connect } from "../../../libs/common/rabbitMq.js";
import { connectRedis } from "./config/redis.js"; // Assuming this is a simple connection setup
// ⛔️ REMOVED: Controller import is moved into the startup function.
// import "./controller/socket.controller.js";

dotenv.config();

// ⛔️ REMOVED: Connection calls are moved into the startup function.

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// This export needs to be available, but io will be initialized inside startServer
export let io;

const startServer = async () => {
  try {
    // ✅ STEP 1: Connect to RabbitMQ
    console.log("[SOCKET] Connecting to RabbitMQ...");
    await connect();
    console.log("[SOCKET] RabbitMQ connection successful.");

    // ✅ STEP 2: Set up RabbitMQ Responders
    console.log("[SOCKET] Setting up RabbitMQ responders...");
    await import("./controller/socket.controller.js");
    console.log("[SOCKET] Responders are ready.");

    // ✅ STEP 3: Connect to your primary database
    console.log("[SOCKET] Connecting to Database...");
    await dbConnect();
    console.log("[SOCKET] Database connection successful.");

    // ✅ STEP 4: Connect to Redis
    console.log("[SOCKET] Connecting to Redis...");
    await connectRedis(); // Assuming connectRedis is async and establishes connection
    console.log("[SOCKET] Redis connection successful.");

    // ✅ STEP 5: Set up HTTP and Socket.IO servers
    const httpServer = http.createServer(app);
    io = new Server(httpServer, {
      path: "/api/v2/socket",
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
        methods: ["GET", "POST"],
      },
    });

    // ✅ STEP 6: Set up Redis Adapter for Socket.IO
    const pubClient = createClient({
      url: `redis://${process.env.REDIS_HOST || "localhost"}:${
        process.env.REDIS_PORT || 6379
      }`,
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[SOCKET] Socket.IO Redis Adapter connected.");

    // Set up Socket.IO middleware and event handlers
    io.use((socket, next) => {
      const token = socket.handshake.query.token;
      if (!token) {
        return next(new Error("Authentication error: Token not provided."));
      }
      const decodedUser = verifyToken(token);
      if (!decodedUser) {
        return next(new Error("Authentication error: Invalid token."));
      }
      socket.user = decodedUser;
      next();
    });

    initializeSocketEvents(io);

    // ✅ STEP 7: Start the server
    const PORT = process.env.SOCKET_PORT || 5006;
    httpServer.listen(PORT, () => {
      console.log(
        `[SOCKET] Service is fully started, server running on port ${PORT}`
      );
      console.log(`[SOCKET] Socket.IO is listening on path: /api/v2/socket`);
    });
  } catch (error) {
    console.error("[SOCKET] Failed to start service:", error);
    process.exit(1);
  }
};

// This function allows other files to get the initialized io instance
export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
};

startServer();
