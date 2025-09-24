import http from "http";
import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import { createAdapter } from "@socket.io/redis-adapter";

import { initializeSocketEvents } from "./services/socket.handler.js";
import { verifyToken } from "./utils/verifyToken.js";
import { dbConnect } from "./config/dbConnect.js";
import { connect } from "../../../libs/common/rabbitMq.js";
import { connectRedis } from "./config/redis.js";
import { createClient } from "redis";
import "./controller/socket.controller.js";

dotenv.config();
dbConnect();
connect();
connectRedis();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

let io;

io = new Server(httpServer, {
  path: "/api/v2/socket",
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST"],
  },
});

const pubClient = createClient({
  url: `redis://${process.env.REDIS_HOST || "localhost"}:${
    process.env.REDIS_PORT || 6379
  }`,
});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Socket.IO Redis Adapter connected");
});

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
};

io.use((socket, next) => {
  const token = socket.handshake.query.token;

  if (!token) {
    console.error("Connection rejected: No token provided.");
    return next(new Error("Authentication error: Token not provided."));
  }

  const decodedUser = verifyToken(token);

  if (!decodedUser) {
    console.error(`Connection rejected: Invalid token for socket ${socket.id}`);
    return next(new Error("Authentication error: Invalid token."));
  }

  socket.user = decodedUser;
  next();
});

initializeSocketEvents(io);

const PORT = process.env.SOCKET_PORT || 5006;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO is listening on path: /api/v2/socket`);
});
