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
import accountDashboardRoutes from "./routes/accounts/accountDashbaord.routes.js";
import expenseRoutes from "./routes/accounts/expense.routes.js";
import attendanceRoutes from "./routes/property/attendance.route.js";
import salaryRoutes from "./routes/accounts/staffSalaryHistory.routes.js";
import carouselRoutes from "./routes/property/carousel.routes.js";
import voucherRoutes from "./routes/accounts/voucher.routes.js";
import referralRoutes from "./routes/user/referral.routes.js";
import depositPaymentRoutes from "./routes/accounts/depositPayment.routes.js";
import reminderRoutes from "./routes/user/reminder.routes.js";
import logRoutes from "./routes/accounts/accountsLog.routes.js";
import gamingRoutes from "./routes/user/gaming.routes.js";
import floorRoutes from "./routes/property/floor.routes.js";
import assetRoutes from "./routes/property/asset.routes.js";
import websiteRoutes from "./routes/property/website.routes.js";
import accountingRoutes from "./routes/accounts/accounting.routes.js";
import reportRoutes from "./routes/accounts/reports.routes.js";
import coaRoutes from "./routes/accounts/chartOfAccounts.routes.js";
import accountSettingRoutes from "./routes/accounts/accountSetting.routes.js";
import shopOwnerRoutes from "./routes/order/shopOwner.routes.js";
import businessCategoryRoutes from "./routes/order/businessCategory.routes.js";
import merchantRoutes from "./routes/order/merchant.routes.js";
import productCategoryRoutes from "./routes/order/productCategory.routes.js";
import productRoutes from "./routes/order/product.routes.js";
import merchantDiscountRoutes from "./routes/order/merchantDiscount.routes.js";
import productDiscountRoutes from "./routes/order/productDiscount.routes.js";
import deliveryChargeRoutes from "./routes/order/deliveryCharge.routes.js";
import orderRoutes from "./routes/order/order.routes.js";
import dailyInventoryRoutes from "./routes/inventory/dailyInventoryRequirement.routes.js";

dotenv.config();
const app = express();
// ⛔️ REMOVED: The connect() call is moved into the startup function to ensure proper order.

// ----- Middleware ----- //
app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://hpanel.heavensliving.in",
      "http://192.168.1.73:8082",
      "http://192.168.1.80:8082",
      "http://192.168.1.75:8082",
      "http://192.168.1.80:5173",
      "http://localhost:8082",
      "http://192.168.1.73:5173"
    ],
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
app.use("/api/v2/client/pettyCash", pettyCashRoutes);
app.use("/api/v2/inventory/mess", mealRoutes);
app.use("/api/v2/inventory/mess-booking", messBookingRoutes);
app.use("/api/v2/inventory/kitchen", kitchenRoutes);
app.use("/api/v2/inventory/inventorylogs", inventoryLogRoutes);
app.use("/api/v2/inventory", inventoryRoutes);
app.use("/api/v2/inventory/daily-requirement", dailyInventoryRoutes);
app.use("/api/v2/inventory/category", categoryRoutes);
app.use("/api/v2/inventory/addon-booking", addonBookingRoutes);
app.use("/api/v2/inventory/addon", addonRoutes);
app.use("/api/v2/property/floor", floorRoutes);
app.use("/api/v2/property/asset", assetRoutes);
app.use("/api/v2/property", propertyRoutes);
app.use("/api/v2/property/dashboard", dashboardRoutes);
app.use("/api/v2/staff", staffRoutes);
app.use("/api/v2/user", userRoutes);
app.use("/api/v2/user/logs", userLogRoutes);
app.use("/api/v2/property/room", roomRoutes);
app.use("/api/v2/notification/push-notification", pushNotificationRoutes);
app.use("/api/v2/notification", notificationRoutes);
app.use("/api/v2/notification/alert-Notification", alertNotificationRoutes);
app.use("/api/v2/feePayments", feePaymentRoutes);
app.use("/api/v2/depositPayments", depositPaymentRoutes);
app.use("/api/v2/feePayments/dashboard", accountDashboardRoutes);
app.use("/api/v2/commission", commissionRoutes);
app.use("/api/v2/property/maintenance", maintenanceRoutes);
app.use("/api/v2/property/logs", propertyLogRoutes);
app.use("/api/v2/expense", expenseRoutes);
app.use("/api/v2/attendance", attendanceRoutes);
app.use("/api/v2/staff-salary", salaryRoutes);
app.use("/api/v2/attendance", attendanceRoutes);
app.use("/api/v2/property/carousel", carouselRoutes);
app.use("/api/v2/voucher", voucherRoutes);
app.use("/api/v2/referral", referralRoutes);
app.use("/api/v2/reminder", reminderRoutes);
app.use("/api/v2/accounts-log", logRoutes);
app.use("/api/v2/gaming", gamingRoutes);
app.use("/api/v2/website", websiteRoutes);
app.use("/api/v2/accounting", accountingRoutes);
app.use("/api/v2/reports", reportRoutes);
app.use("/api/v2/chart-of-accounts", coaRoutes);
app.use("/api/v2/account-settings", accountSettingRoutes);
app.use("/api/v2/order/shop-owner", shopOwnerRoutes);
app.use("/api/v2/order/business-category", businessCategoryRoutes);
app.use("/api/v2/order/merchant", merchantRoutes);
app.use("/api/v2/order/product-category", productCategoryRoutes);
app.use("/api/v2/order/product", productRoutes);
app.use("/api/v2/order/discount/merchant", merchantDiscountRoutes);
app.use("/api/v2/order/discount/product", productDiscountRoutes);
app.use("/api/v2/order/delivery-charge", deliveryChargeRoutes);
app.use("/api/v2/order", orderRoutes);
// ----- Health Check ----- //
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK CI/CD is working fine and running." });
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
