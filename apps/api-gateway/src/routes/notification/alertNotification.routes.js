import express from "express";
import {
  addAlertNotificationController,
  deleteAlertNotificationController,
  getAlertNotificationsController,
} from "../../controllers/notification/alertNotification.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";
const alertNotificationRoutes = express.Router();

alertNotificationRoutes.post(
  "/",
  upload.single("alertNotificationImage"),
  addAlertNotificationController
);
alertNotificationRoutes.get("/", getAlertNotificationsController);
alertNotificationRoutes.delete("/:id", deleteAlertNotificationController);

export default alertNotificationRoutes;
