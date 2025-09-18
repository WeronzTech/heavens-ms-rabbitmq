import express from "express";
// import {
//   addPushNotificationController,
//   deletePushNotificationController,
//   getPushNotificationsController,
//   sendPushNotificationController,
//   updatePushNotificationController,
// } from "../controllers/pushNotification.controller.js";
// import { upload } from "../utils/imageOperation.js";

const pushNotificationRoutes = express.Router();

// pushNotificationRoutes.post(
//   "/",
//   upload.single("pushNotifications"),
//   addPushNotificationController
// );
// pushNotificationRoutes.put(
//   "/:id",
//   upload.single("pushNotifications"),
//   updatePushNotificationController
// );
// pushNotificationRoutes.delete("/:id", deletePushNotificationController);
// pushNotificationRoutes.get("/", getPushNotificationsController);
// pushNotificationRoutes.post("/send/:id", sendPushNotificationController);

export default pushNotificationRoutes;
