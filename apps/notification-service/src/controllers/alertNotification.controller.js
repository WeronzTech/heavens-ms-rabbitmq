import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../libs/patterns/notification/notification.pattern.js";
import { addAlertNotification, deleteAlertNotification, getAlertNotifications } from "../service/alertNotification.service.js";

createResponder(
  NOTIFICATION_PATTERN.ALERT_NOTIFICATION.ADD_ALERT_NOTIFICATION,
  async (data) => {
    return await addAlertNotification(data);
  }
);

createResponder(
  NOTIFICATION_PATTERN.ALERT_NOTIFICATION.DELETE_ALERT_NOTIFICATION,
  async (data) => {
    return await deleteAlertNotification(data);
  }
);

createResponder(
  NOTIFICATION_PATTERN.ALERT_NOTIFICATION.GET_ALERT_NOTIFICATIONS,
  async (data) => {
    return await getAlertNotifications(data);
  }
);