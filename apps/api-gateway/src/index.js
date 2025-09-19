import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { CLIENT_ORIGIN, HOST, PORT } from "./config/env.js";
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
import propertyLogRoutes from "./routes/property/propertyLog.routes.js";
import userLogRoutes from "./routes/user/userLogs.routes.js";

dotenv.config();
const app = express();
connect();

// ----- Middleware ----- //
app.use(express.json());
// app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(
  cors({
    origin: ["http://192.168.1.80:5173", "https://yourfrontend.com"],
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("combined"));

app.use("/api/v2/auth", authRoutes);
app.use("/api/v2/auth/role", roleRoutes);
app.use("/api/v2/client", clientRoutes);
app.use("/api/v2/client/manager", managerRoutes);
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
app.use("/api/v2/user", userRoutes);
app.use("/api/v2/user/logs", userLogRoutes);
app.use("/api/v2/room", roomRoutes);
app.use("/api/v2/staff", staffRoutes);
app.use("/api/v2/pushNotification", pushNotificationRoutes);
app.use("/api/v2/notification", notificationRoutes);
app.use("/api/v2/alertNotification", alertNotificationRoutes);
app.use("/api/v2/feePayments", feePaymentRoutes);
app.use("/api/v2/logs", propertyLogRoutes)

// ----- Health Check ----- //
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

// services.forEach(({ route, target }) => {
//   const isSocketRoute = route.includes("socket");
//   app.use(
//     route,
//     createProxyMiddleware({
//       target,
//       changeOrigin: true,
//       logLevel: "debug",
//       ws: isSocketRoute,
//       onProxyReq: (proxyReq, req) => {
//         // Forward all user context headers
//         if (req.userAuth) {
//           proxyReq.setHeader("x-user-id", req.userAuth);
//         }
//         if (req.userRole) {
//           proxyReq.setHeader("x-user-role", req.userRole);
//         }
//         if (req.userName) {
//           proxyReq.setHeader("x-user-userName", req.userName);
//         }

//         // Handle body forwarding
//         const contentType = req.headers["content-type"];
//         if (
//           req.body &&
//           contentType &&
//           contentType.includes("application/json")
//         ) {
//           const bodyData = JSON.stringify(req.body);
//           proxyReq.setHeader("Content-Type", "application/json");
//           proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
//           proxyReq.write(bodyData);
//         }
//       },
//       proxyTimeout: 30000,
//       timeout: 30000,
//     })
//   );
// });

app.get("/", (_, res) => {
  res.send("API Gateway is up and running!");
});

// ----- Global Error Handler ----- //
// app.use(errorHandler);

// ----- Start Server ----- //
app.listen(process.env.API_GATEWAY_PORT, () => {
  console.log(
    `API Gateway running at http://${HOST || "localhost"}:${
      process.env.API_GATEWAY_PORT
    }`
  );
});
