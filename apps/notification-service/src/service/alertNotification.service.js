import { uploadToFirebase } from "../../../../libs/common/imageOperation.js";
import AlertNotification from "../models/alertNotification.model.js";
import FcmToken from "../models/fcmToken.model.js";
import { sendPushNotificationToUser } from "../utils/sendNotificationHelper.js";

export const addAlertNotification = async ({ data }) => {
  try {
    const { title, description, userId, file } = data;

    let imageUrl = "";
    if (file) {
      imageUrl = await uploadToFirebase(file, "alertNotificationImage");
    }

    const formattedId = userId?.toUpperCase();

    const alertNotificationData = {
      title,
      description,
      imageUrl,
      userId: formattedId,
    };

    // Send push notification if FCM token exists
    const tokenRecord = await FcmToken.findOne({ userId: formattedId });
    let isNotificationSent = false;

    if (tokenRecord?.token?.length) {
      const notificationMessage = { title, body: description, image: imageUrl };

      for (const token of tokenRecord.token) {
        const success = await sendPushNotificationToUser(
          token,
          notificationMessage
        );
        if (success) isNotificationSent = true;
      }
    }

    // Save alert notification
    const newAlertNotification = await AlertNotification.create(
      alertNotificationData
    );

    // Save notification log if sent
    if (isNotificationSent) {
      await NotificationLog.create({
        userId,
        title,
        description,
        image: imageUrl,
      });
    }

    return {
      status: 201,
      data: {
        message: "Alert notification added successfully!",
        alertNotification: newAlertNotification,
      },
    };
  } catch (err) {
    console.error("RPC Add Alert Notification Error:", err);
    return {
      status: 500,
      message: err.message || "Failed to add alert notification",
    };
  }
};

export const deleteAlertNotification = async ({ data }) => {
  try {
    const { id } = data;

    const deletedNotification = await AlertNotification.findByIdAndDelete(id);

    if (!deletedNotification) {
      return { status: 404, message: "Alert notification not found" };
    }

    return {
      status: 200,
      data: { message: "Alert notification deleted successfully" },
    };
  } catch (error) {
    console.error("RPC Delete Alert Notification Error:", error);
    return {
      status: 500,
      message: error.message || "Failed to delete alert notification",
    };
  }
};

export const getAlertNotifications = async ({ data }) => {
  try {
    const { userId } = data;
    const filter = {};

    if (userId) {
      filter.userId = userId;
    }

    const notifications = await AlertNotification.find(filter).sort({
      createdAt: -1,
    });

    return { status: 200, data: { notifications } };
  } catch (error) {
    console.error("RPC Get Alert Notifications Error:", error);
    return {
      status: 500,
      message: error.message || "Failed to fetch alert notifications",
    };
  }
};
