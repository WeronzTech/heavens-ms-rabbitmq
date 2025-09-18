import express from "express";
import { getNotificationLogsController, saveFcmTokenController } from "../../controllers/notification/notification.controller.js";


const notificationRoutes = express.Router();

 notificationRoutes.post("/save-fcm-token", saveFcmTokenController);
// notificationRoutes.post(
//   "/",
//   upload.single("notificationImage"),
//   sendNotificationController
// );
notificationRoutes.get("/", getNotificationLogsController);

export default notificationRoutes;
