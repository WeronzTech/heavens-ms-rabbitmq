import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../../libs/patterns/notification/notification.pattern.js";

export const addAlertNotificationController = async (req, res) => {
    try {
      const { title, description, userId, file } = req.body; // include optional file
  
      const response = await sendRPCRequest(
        NOTIFICATION_PATTERN.ALERT_NOTIFICATION.ADD_ALERT_NOTIFICATION, // ✅ new pattern
        { data: { title, description, userId, file } }      // wrapped in data
      );
  
      return res.status(response?.status || 500).json(response);
    } catch (error) {
      console.error("RPC Add Alert Notification Controller Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  export const deleteAlertNotificationController = async (req, res) => {
    try {
      const { id } = req.params;
  
      const response = await sendRPCRequest(
        NOTIFICATION_PATTERN.ALERT_NOTIFICATION.DELETE_ALERT_NOTIFICATION,
        { data: { id } } // ✅ wrap id in data
      );
  
      return res.status(response?.status || 500).json(response);
    } catch (error) {
      console.error("RPC Delete Alert Notification Controller Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
  
  export const getAlertNotificationsController = async (req, res) => {
    try {
      const { userId } = req.query;
  
      const response = await sendRPCRequest(
        NOTIFICATION_PATTERN.ALERT_NOTIFICATION.GET_ALERT_NOTIFICATIONS,
        { data: { userId } } // ✅ wrap filters in data
      );
  
      return res.status(response?.status || 500).json(response);
    } catch (error) {
      console.error("RPC Get Alert Notifications Controller Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };