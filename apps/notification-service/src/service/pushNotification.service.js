import axios from "axios";
import FcmToken from "../models/fcmToken.model.js";
import PushNotification from "../models/pushNotification.model.js";
import { sendPushNotificationToUser } from "../utils/sendNotificationHelper.js";
import { uploadToFirebase } from "../../../../libs/common/imageOperation.js";

export const addPushNotification = async (data) => {
  try {
    const {
      title,
      description,
      messOnly,
      studentOnly,
      dailyRentOnly,
      workerOnly,
      file, // file should be passed in RPC payload if needed
    } = data;

    let imageUrl = "";
    if (file) {
      imageUrl = await uploadToFirebase(file, "pushNotifications");
    }

    const newNotification = await PushNotification.create({
      title,
      description,
      imageUrl,
      messOnly,
      studentOnly,
      dailyRentOnly,
      workerOnly,
    });

    return {
      status: 200,
      data: {
        message: "Push notification created successfully",
        notification: newNotification,
      },
    };
  } catch (error) {
    console.error("RPC Push Notification Error:", error);
    return {
      status: 500,
      message: error.message || "Failed to create push notification",
    };
  }
};

export const updatePushNotification = async (data) => {
  try {
    const {
      id,
      title,
      description,
      messOnly,
      studentOnly,
      dailyRentOnly,
      workerOnly,
      file,
    } = data;

    let updateData = {
      title,
      description,
      messOnly,
      studentOnly,
      dailyRentOnly,
      workerOnly,
    };

    if (file) {
      const imageUrl = await uploadToFirebase(file, "pushNotifications");
      updateData.imageUrl = imageUrl;
    }

    const updated = await PushNotification.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updated) {
      return { status: 404, message: "Notification not found" };
    }

    return {
      status: 200,
      data: {
        message: "Push notification updated successfully",
        notification: updated,
      },
    };
  } catch (error) {
    console.error("RPC Update Push Notification Error:", error);
    return {
      status: 500,
      message: error.message || "Failed to update push notification",
    };
  }
};

export const deletePushNotification = async ({ data }) => {
  try {
    const { id } = data; // ✅ safely extract id

    const deleted = await PushNotification.findByIdAndDelete(id);

    if (!deleted) {
      return { status: 404, message: "Notification not found" };
    }

    return {
      status: 200,
      data: { message: "Push notification deleted successfully" },
    };
  } catch (error) {
    console.error("RPC Delete Push Notification Error:", error);
    return {
      status: 500,
      message: error.message || "Failed to delete push notification",
    };
  }
};

export const getPushNotifications = async ({ data }) => {
  try {
    const { studentOnly, messOnly, workerOnly, dailyRentOnly } = data; // ✅ extract from data

    const query = {};
    if (studentOnly !== undefined) query.studentOnly = studentOnly;
    if (messOnly !== undefined) query.messOnly = messOnly;
    if (workerOnly !== undefined) query.workerOnly = workerOnly;
    if (dailyRentOnly !== undefined) query.dailyRentOnly = dailyRentOnly;

    const notifications = await PushNotification.find(query).sort({
      createdAt: -1,
    });

    return { status: 200, data: { notifications } };
  } catch (error) {
    console.error("RPC Get Push Notifications Error:", error);
    return {
      status: 500,
      message: error.message || "Failed to fetch push notifications",
    };
  }
};

export const sendPushNotification = async ({ data }) => {
  try {
    const { id } = data; // ✅ extract id from data

    const notification = await PushNotification.findById(id);
    if (!notification) {
      return { status: 404, message: "Push notification not found" };
    }

    const {
      title,
      description,
      imageUrl,
      messOnly,
      studentOnly,
      workerOnly,
      dailyRentOnly,
    } = notification;

    // Build query for user-service
    const params = new URLSearchParams();
    if (messOnly) params.append("messOnly", "true");
    if (studentOnly) params.append("studentOnly", "true");
    if (workerOnly) params.append("workerOnly", "true");
    if (dailyRentOnly) params.append("dailyRentOnly", "true");

    const apiUrl = `${
      process.env.STUDENT_API_BASE_URL
    }/user/push-notification?${params.toString()}`;

    // Fetch user IDs
    const { data: userArray } = await axios.get(apiUrl);
    if (!Array.isArray(userArray) || !userArray.length) {
      return {
        status: 200,
        data: { message: "No target users returned by student API" },
      };
    }

    const ids = userArray.map((item) => item.id);

    // Find FCM tokens
    const tokenDocs = await FcmToken.find({ userId: { $in: ids } });
    if (!tokenDocs.length) {
      return {
        status: 200,
        data: { message: "No FCM tokens found for returned user IDs" },
      };
    }

    const message = { title, body: description, image: imageUrl };
    let sentCount = 0;
    const successfulUserIds = new Set();

    for (const doc of tokenDocs) {
      for (const token of doc.token) {
        const success = await sendPushNotificationToUser(token, message);
        if (success) {
          sentCount++;
          successfulUserIds.add(doc.userId.toString());
        }
      }
    }

    // Save logs
    //   if (successfulUserIds.size > 0) {
    //     const logEntries = Array.from(successfulUserIds).map((userId) => ({
    //       userId,
    //       title,
    //       description,
    //       image: imageUrl,
    //     }));
    //     await NotificationLog.insertMany(logEntries);
    //   }

    return {
      status: 200,
      data: {
        message: `Push notification sent successfully to ${sentCount} device${
          sentCount !== 1 ? "s" : ""
        }.`,
      },
    };
  } catch (error) {
    console.error("RPC Send Push Notification Error:", error);
    return {
      status: 500,
      message: error.message || "Failed to send push notification",
    };
  }
};
