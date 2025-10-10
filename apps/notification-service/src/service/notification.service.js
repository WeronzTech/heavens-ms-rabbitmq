import { uploadToFirebase } from "../../../../libs/common/imageOperation.js";
import FcmToken from "../models/fcmToken.model.js";
import NotificationLog from "../models/notificationLog.model.js";
import { sendPushNotificationToUser } from "../utils/sendNotificationHelper.js";

export const saveFcmToken = async ({ data }) => {
  try {
    const { userId, token } = data;

    if (!userId || !token) {
      return { status: 400, message: "userId and token are required" };
    }

    const existing = await FcmToken.findOne({ userId });

    if (existing) {
      const tokens = existing.token;

      // Token already exists → do nothing
      if (tokens.includes(token)) {
        return { status: 200, data: { message: "Token already exists" } };
      }

      // If already 2 tokens → remove the first (oldest)
      if (tokens.length >= 2) {
        tokens.shift(); // remove first
      }

      // Add new token
      tokens.push(token);
      existing.token = tokens;
      await existing.save();

      return { status: 200, data: { message: "Token updated successfully" } };
    }

    // No existing record → create new with this token
    await FcmToken.create({
      userId,
      token: [token],
    });

    return { status: 201, data: { message: "Token saved successfully" } };
  } catch (error) {
    console.error("RPC Save FCM Token Error:", error);
    return {
      status: 500,
      message: error.message || "Failed to save FCM token",
    };
  }
};

export const sendNotification = async ({ data }) => {
  try {
    const { title, description, userId, file } = data;

    let imageUrl = "";
    if (file?.notificationImage && file?.notificationImage[0].buffer) {
      const imageFile = {
        buffer: Buffer.from(file?.notificationImage[0]?.buffer, "base64"),
        mimetype: file?.notificationImage[0]?.mimetype,
        originalname: file?.notificationImage[0]?.originalname,
      };
      imageUrl = await uploadToFirebase(imageFile, "notification");
    }
    // Find FCM tokens for the user
    const tokenRecord = await FcmToken.findOne({ userId });

    let isNotificationSent = false;
    if (tokenRecord && tokenRecord.token?.length) {
      const notificationMessage = {
        title,
        body: description,
        image: imageUrl,
      };

      for (const token of tokenRecord.token) {
        const success = await sendPushNotificationToUser(
          token,
          notificationMessage
        );
        if (success) {
          isNotificationSent = true;
        }
      }
    }

    // Optional: Save notification log
    if (isNotificationSent) {
      const newLog = new NotificationLog({
        userId,
        title,
        description,
        image: imageUrl,
      });
      await newLog.save();
    }

    return {
      status: 201,
      data: { message: "Notification sent successfully!" },
    };
  } catch (err) {
    console.error("RPC Send Notification Error:", err);
    return {
      status: 500,
      message: err.message || "Failed to send notification",
    };
  }
};

export const getNotificationLogs = async ({ data = {} }) => {
  try {
    const { userId } = data; // extract userId from RPC payload
    const filter = {};

    if (userId) {
      filter.userId = userId;
    }

    const notificationLogs = await NotificationLog.find(filter).sort({
      createdAt: -1,
    });

    return {
      status: 200,
      data: { notificationLogs },
    };
  } catch (err) {
    console.error("RPC Get Notification Logs Error:", err);
    return {
      status: 500,
      message: err.message || "Failed to fetch notification logs",
    };
  }
};
