import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import { HOST } from "./config/env.js";
import authRoutes from "./routes/auth/auth.routes.js";
import roleRoutes from "./routes/auth/role.routes.js";
import { connect } from "../../../libs/common/rabbitMq.js";
import clientRoutes from "./routes/client/client.routes.js";
import managerRoutes from "./routes/client/manager.routes.js";
import mealRoutes from "./routes/inventory/messMenu.route.js";
import messBookingRoutes from "./routes/inventory/mealBooking.route.js";
import kitchenRoutes from "./routes/inventory/kitchen.routes.js";
import inventoryLogRoutes from "./routes/inventory/inventoryLog.routes.js";
import inventoryRoutes from "./routes/inventory/inventory.routes.js";
import internalRoutes from "./routes/inventory/internal.routes.js";
import categoryRoutes from "./routes/inventory/category.routes.js";
import addonBookingRoutes from "./routes/inventory/addonBooking.route.js";
import addonRoutes from "./routes/inventory/addon.route.js";
import propertyRoutes from "./routes/property/property.routes.js";
import userRoutes from "./routes/user/user.routes.js";
import roomRoutes from "./routes/property/room.routes.js";
import staffRoutes from "./routes/property/staff.routes.js";
import pushNotificationRoutes from "./routes/notification/pushNotification.routes.js";
import notificationRoutes from "./routes/notification/notification.routes.js";
import alertNotificationRoutes from "./routes/notification/alertNotification.routes.js";
import feePaymentRoutes from "./routes/accounts/feePayment.routes.js";
import socketRoutes from "./routes/socket/socket.routes.js";
import maintenanceRoutes from "./routes/property/maintenance.routes.js";
import propertyLogRoutes from "./routes/property/propertyLog.routes.js";
import userLogRoutes from "./routes/user/userLogs.routes.js";
import pettyCashRoutes from "./routes/client/pettyCash.routes.js";
import dashboardRoutes from "./routes/property/dashboard.routes.js";
import agencyRoutes from "./routes/client/agency.routes.js";
import commissionRoutes from "./routes/accounts/commission.routes.js";
import expenseRoutes from "./routes/accounts/expense.routes.js";

dotenv.config();
const app = express();
// ⛔️ REMOVED: The connect() call is moved into the startup function to ensure proper order.

// ----- Middleware ----- //
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://192.168.1.80:5173"],
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("combined"));

const socketProxy = createProxyMiddleware({
  target: process.env.SOCKET_SERVICE_URL, // e.g., 'http://socket-service:5006'
  ws: true, // Enable WebSocket proxying
  logLevel: "info",
  onError: (err, req, res) => {
    console.error("Socket Proxy Error:", err);
    res.writeHead(500, {
      "Content-Type": "text/plain",
    });
    res.end("Something went wrong with the WebSocket connection.");
  },
});

// Apply routes
app.use("/api/v2/socket", socketProxy);
app.use("/api/v2/internalSocket", socketRoutes);
app.use("/api/v2/auth", authRoutes);
app.use("/api/v2/auth/role", roleRoutes);
app.use("/api/v2/client", clientRoutes);
app.use("/api/v2/client/manager", managerRoutes);
app.use("/api/v2/client/agency", agencyRoutes);
app.use("/api/v2/inventory/mess", mealRoutes);
app.use("/api/v2/inventory/mess-booking", messBookingRoutes);
app.use("/api/v2/inventory/kitchen", kitchenRoutes);
app.use("/api/v2/inventory/inventorylogs", inventoryLogRoutes);
app.use("/api/v2/inventory", inventoryRoutes);
app.use("/api/v2/inventory/internal", internalRoutes);
app.use("/api/v2/inventory/category", categoryRoutes);
app.use("/api/v2/inventory/addon-booking", addonBookingRoutes);
app.use("/api/v2/inventory/addon", addonRoutes);
app.use("/api/v2/property", propertyRoutes);
app.use("/api/v2/property/dashboard", dashboardRoutes);
app.use("/api/v2/user", userRoutes);
app.use("/api/v2/user/logs", userLogRoutes);
app.use("/api/v2/room", roomRoutes);
app.use("/api/v2/staff", staffRoutes);
app.use("/api/v2/pushNotification", pushNotificationRoutes);
app.use("/api/v2/notification", notificationRoutes);
app.use("/api/v2/alertNotification", alertNotificationRoutes);
app.use("/api/v2/feePayments", feePaymentRoutes);
app.use("/api/v2/commission", commissionRoutes);
app.use("/api/v2/property/maintenance", maintenanceRoutes);
app.use("/api/v2/logs", propertyLogRoutes);
app.use("/api/v2/pettycash", pettyCashRoutes);
app.use("/api/v2/expense",expenseRoutes)

// ----- Health Check ----- //
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

app.get("/", (_, res) => {
  res.send("API Gateway is up and running!");
});

// ----- Main Server Startup Function ----- //
const startServer = async () => {
  try {
    // ✅ STEP 1: Connect to RabbitMQ and wait for it to finish.
    console.log("[API-GATEWAY] Connecting to RabbitMQ...");
    await connect();
    console.log("[API-GATEWAY] RabbitMQ connection successful.");

    // ✅ STEP 2: Start the HTTP server AFTER the connection is ready.
    app.listen(process.env.API_GATEWAY_PORT, () => {
      console.log(
        `[API-GATEWAY] Server is ready and listening at http://${
          HOST || "localhost"
        }:${process.env.API_GATEWAY_PORT}`
      );
    });
  } catch (error) {
    console.error("[API-GATEWAY] Failed to start:", error);
    process.exit(1);
  }
};

startServer();
