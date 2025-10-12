import express from "express";
import {
  addPushNotificationController,
  deletePushNotificationController,
  getPushNotificationsController,
  sendPushNotificationController,
  updatePushNotificationController,
} from "../../controllers/notification/pushNotification.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const pushNotificationRoutes = express.Router();

pushNotificationRoutes.use(isAuthenticated);

pushNotificationRoutes.post(
  "/add",
  hasPermission(PERMISSIONS.NOTIFICATION_MANAGE),
  upload.fields([{ name: "pushNotifications", maxCount: 1 }]),
  addPushNotificationController
);
pushNotificationRoutes.put(
  "/:id",
  hasPermission(PERMISSIONS.NOTIFICATION_MANAGE),
  upload.fields([{ name: "pushNotifications", maxCount: 1 }]),
  updatePushNotificationController
);
pushNotificationRoutes.delete(
  "/:id",
  hasPermission(PERMISSIONS.NOTIFICATION_MANAGE),
  deletePushNotificationController
);
pushNotificationRoutes.get(
  "/",
  hasPermission(PERMISSIONS.NOTIFICATION_VIEW),
  getPushNotificationsController
);
pushNotificationRoutes.post(
  "/send/:id",
  hasPermission(PERMISSIONS.NOTIFICATION_MANAGE),
  sendPushNotificationController
);

export default pushNotificationRoutes;
