import express from "express";
import {
  getNotificationLogsController,
  saveFcmTokenController,
  sendNotificationController,
} from "../../controllers/notification/notification.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const notificationRoutes = express.Router();

notificationRoutes.post("/save-fcm-token", saveFcmTokenController);
notificationRoutes.post(
  "/",
  upload.fields([{ name: "notificationImage", maxCount: 1 }]),
  sendNotificationController
);
notificationRoutes.get("/", getNotificationLogsController);

export default notificationRoutes;
