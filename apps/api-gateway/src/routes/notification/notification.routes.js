import express from "express";
import {
  getNotificationLogsController,
  saveFcmTokenController,
  sendNotificationController,
} from "../../controllers/notification/notification.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const notificationRoutes = express.Router();

notificationRoutes.use(isAuthenticated);

notificationRoutes.post("/save-fcm-token", saveFcmTokenController);
notificationRoutes.post(
  "/",
  hasPermission(PERMISSIONS.NOTIFICATION_MANAGE),
  upload.fields([{ name: "notificationImage", maxCount: 1 }]),
  sendNotificationController
);
notificationRoutes.get(
  "/",
  hasPermission(PERMISSIONS.NOTIFICATION_VIEW),
  getNotificationLogsController
);

export default notificationRoutes;
