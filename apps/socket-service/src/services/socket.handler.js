import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import {
  addUser,
  findSocketIdByUserId,
  findUserIdBySocketId,
  getOnlineUsers,
  removeUserBySocketId,
} from "../store/user.store.js";

export const initializeSocketEvents = (io) => {
  io.on("connection", async (socket) => {
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
    io.emit("onlineUsers", await getOnlineUsers());
    console.log("Current online users:", await getOnlineUsers());

    socket.on("private message", async ({ recipientId, message }) => {
      console.log(`Message from ${socket.id} to ${recipientId}: ${message}`);
      const recipientSocketId = await findSocketIdByUserId(recipientId);

      if (recipientSocketId) {
        const senderId = await findUserIdBySocketId(socket.id);
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

    // socket.on("user-booking-status", async (data) => {
    //   try {
    //     const { today } = data;
    //     const currentUserId = await findUserIdBySocketId(socket.id);

    //     if (!currentUserId) {
    //       // Acknowledge with an error if the user isn't found in the store
    //       return {
    //         success: false,
    //         message: "Authentication error: User not found for this socket.",
    //       };
    //     }

    //     console.log(
    //       `Received user-booking-status request for userId: ${currentUserId}`
    //     );

    //     const response = await sendRPCRequest(
    //       INVENTORY_PATTERN.BOOKING.CHECK_NEXT_DAY_BOOKING,
    //       {
    //         userId: currentUserId,
    //         today,
    //       }
    //     );

    //     const breakfastBooking = response.data.bookingDetails.find(
    //       (booking) => booking.mealType === "Breakfast"
    //     );

    //     // Now you can safely access the status property of that object
    //     // It's good practice to check if a booking was actually found
    //     const breakfastStatus = breakfastBooking
    //       ? breakfastBooking.status
    //       : "Not Booked";

    //     console.log(
    //       "Response from booking service (Breakfast Status):",
    //       breakfastStatus
    //     );
    //     // Emit the response back to the requesting client
    //     socket.emit("booking-status-response", response);
    //   } catch (error) {
    //     console.error("Error processing user-booking-status:", error);
    //     const errorResponse = {
    //       success: false,
    //       message: "An error occurred while fetching booking status.",
    //       error: error.message,
    //     };
    //     socket.emit("booking-status-response", errorResponse);
    //   }
    // });

    socket.on("disconnect", async () => {
      console.log(`Client disconnected: ${socket.id}`);
      const disconnectedUserId = await removeUserBySocketId(socket.id);

      if (disconnectedUserId) {
        console.log(`User unregistered: ${disconnectedUserId}`);
        io.emit("onlineUsers", await getOnlineUsers());
        console.log("Current online users:", await getOnlineUsers());
      }
    });
  });
};
