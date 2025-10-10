import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../../libs/patterns/notification/notification.pattern.js";

export const saveFcmTokenController = async (req, res) => {
  try {
    const { userId, token } = req.body;

    const response = await sendRPCRequest(
      NOTIFICATION_PATTERN.NOTIFICATION.SAVE_FCM_TOKEN,
      { data: { userId, token } } // ✅ wrapped in data
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Save FCM Token Controller Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendNotificationController = async (req, res) => {
  try {
    const { title, description, userId } = req.body;
    const file = req.files;

    const response = await sendRPCRequest(
      NOTIFICATION_PATTERN.NOTIFICATION.SEND_NOTIFICATION,
      { data: { title, description, userId, file } } // ✅ wrapped in data
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getNotificationLogsController = async (req, res) => {
  try {
    const { userId } = req.query; // logs are usually fetched via query
    const response = await sendRPCRequest(
      NOTIFICATION_PATTERN.NOTIFICATION.GET_NOTIFICATION_LOGS,
      { data: { userId } } // ✅ wrapped in data
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get Notification Logs Controller Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
