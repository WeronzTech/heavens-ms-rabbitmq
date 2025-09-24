import { isAuthenticated } from "../middleware/isAuthenticated.js";
import {
  addUser,
  findSocketIdByUserId,
  findUserIdBySocketId,
  getOnlineUsers,
  removeUserBySocketId,
} from "../store/user.store.js";

export const initializeSocketEvents = (io) => {
  io.on("connection", (socket) => {
    const token = socket?.handshake?.query?.token;
    const userId = socket?.handshake?.query?.userId;
    console.log("token", token);
    console.log("userId", userId);

    if (!token) {
      console.error("Connection rejected: No token provided.");
      return new Error("Authentication error: Token not provided.");
    }

    const authenticated = isAuthenticated(token);

    if (!authenticated) {
      console.error(
        `Connection rejected: Invalid token for socket ${socket.id}`
      );

      socket.disconnect();
      return new Error("Authentication error: Invalid token.");
    }
    console.log(`New client connected: ${socket.id}`);

    addUser(userId, socket.id);
    console.log(`User registered: ${userId} with socket ID: ${socket.id}`);
    io.emit("onlineUsers", getOnlineUsers());
    console.log("Current online users:", getOnlineUsers());

    socket.on("private message", ({ recipientId, message }) => {
      console.log(`Message from ${socket.id} to ${recipientId}: ${message}`);
      const recipientSocketId = findSocketIdByUserId(recipientId);

      if (recipientSocketId) {
        const senderId = findUserIdBySocketId(socket.id);
        io.to(recipientSocketId).emit("receive message", {
          senderId: senderId || "anonymous",
          message: message,
        });
        console.log(`Message successfully sent to ${recipientId}`);
      } else {
        socket.emit("user offline", {
          recipientId: recipientId,
          message: `User ${recipientId} is not online.`,
        });
        console.log(`Failed to send message: User ${recipientId} is offline.`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      const disconnectedUserId = removeUserBySocketId(socket.id);

      if (disconnectedUserId) {
        console.log(`User unregistered: ${disconnectedUserId}`);
        io.emit("onlineUsers", getOnlineUsers());
        console.log("Current online users:", getOnlineUsers());
      }
    });
  });
};
