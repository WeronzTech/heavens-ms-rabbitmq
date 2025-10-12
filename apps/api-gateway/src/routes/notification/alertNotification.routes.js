import express from "express";
import {
  addAlertNotificationController,
  deleteAlertNotificationController,
  getAlertNotificationsController,
} from "../../controllers/notification/alertNotification.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const alertNotificationRoutes = express.Router();

alertNotificationRoutes.use(isAuthenticated);

alertNotificationRoutes.post(
  "/",
  hasPermission(PERMISSIONS.NOTIFICATION_MANAGE),
  upload.fields([{ name: "alertNotificationImage", maxCount: 1 }]),
  addAlertNotificationController
);
alertNotificationRoutes.get(
  "/",
  hasPermission(PERMISSIONS.NOTIFICATION_VIEW),
  getAlertNotificationsController
);
alertNotificationRoutes.delete(
  "/:id",
  hasPermission(PERMISSIONS.NOTIFICATION_MANAGE),
  deleteAlertNotificationController
);

export default alertNotificationRoutes;
