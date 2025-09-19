import express from "express";
import { deleteAlertNotificationController, getAlertNotificationsController } from "../../controllers/notification/alertNotification.controller.js";
;

const alertNotificationRoutes = express.Router();

// alertNotificationRoutes.post(
//   "/",
//   upload.single("alertNotificationImage"),
//   addAlertNotificationController
// );
 alertNotificationRoutes.get("/", getAlertNotificationsController);
 alertNotificationRoutes.delete("/:id", deleteAlertNotificationController);

export default alertNotificationRoutes;
