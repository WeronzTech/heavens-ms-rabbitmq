import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../../libs/patterns/notification/notification.pattern.js";

export const addPushNotificationController = async (req, res) => {
  try {
    const {
      title,
      description,
      messOnly,
      studentOnly,
      dailyRentOnly,
      workerOnly,
    } = req.body;
    const file = req.files;

    const payload = {
      title,
      description,
      messOnly,
      studentOnly,
      dailyRentOnly,
      workerOnly,
      file,
    };

    const response = await sendRPCRequest(
      NOTIFICATION_PATTERN.PUSH_NOTIFICATION.ADD_PUSH_NOTIFICATION,
      payload
    );

    if (response.status === 200) {
      return res.status(200).json(response?.data);
    } else {
      return res
        .status(response?.status || 500)
        .json({ message: response?.message || "Something went wrong" });
    }
  } catch (error) {
    console.error("RPC Push Notification Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePushNotificationController = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      messOnly,
      studentOnly,
      dailyRentOnly,
      workerOnly,
    } = req.body;
    const file = req.files;

    const payload = {
      id,
      title,
      description,
      messOnly,
      studentOnly,
      dailyRentOnly,
      workerOnly,
      file,
    };

    const response = await sendRPCRequest(
      NOTIFICATION_PATTERN.PUSH_NOTIFICATION.UPDATE_PUSH_NOTIFICATION,
      payload
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Update Push Notification Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Delete Push Notification
export const deletePushNotificationController = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await sendRPCRequest(
      NOTIFICATION_PATTERN.PUSH_NOTIFICATION.DELETE_PUSH_NOTIFICATION,
      { data: { id } } // ✅ wrap in data
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Delete Push Notification Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get Push Notifications
export const getPushNotificationsController = async (req, res) => {
  try {
    const { studentOnly, messOnly, workerOnly, dailyRentOnly } = req.query;

    const payload = {
      data: {
        studentOnly,
        messOnly,
        workerOnly,
        dailyRentOnly,
      },
    };

    const response = await sendRPCRequest(
      NOTIFICATION_PATTERN.PUSH_NOTIFICATION.GET_PUSH_NOTIFICATIONS,
      payload
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get Push Notifications Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Send Push Notification
export const sendPushNotificationController = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await sendRPCRequest(
      NOTIFICATION_PATTERN.PUSH_NOTIFICATION.SEND_PUSH_NOTIFICATION,
      { data: { id } } // ✅ wrap in data
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Send Push Notification Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
