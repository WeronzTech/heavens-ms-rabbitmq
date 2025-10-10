import express from "express";
import {
  addPushNotificationController,
  deletePushNotificationController,
  getPushNotificationsController,
  sendPushNotificationController,
  updatePushNotificationController,
} from "../../controllers/notification/pushNotification.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const pushNotificationRoutes = express.Router();

pushNotificationRoutes.post(
  "/add",
  upload.fields([{ name: "pushNotifications", maxCount: 1 }]),
  addPushNotificationController
);
pushNotificationRoutes.put(
  "/:id",
  upload.fields([{ name: "pushNotifications", maxCount: 1 }]),
  updatePushNotificationController
);
pushNotificationRoutes.delete("/:id", deletePushNotificationController);
pushNotificationRoutes.get("/", getPushNotificationsController);
pushNotificationRoutes.post("/send/:id", sendPushNotificationController);

export default pushNotificationRoutes;
