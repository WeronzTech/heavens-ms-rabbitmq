import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../libs/patterns/notification/notification.pattern.js";
import {
  addPushNotification,
  deletePushNotification,
  getPushNotifications,
  sendPushNotification,
  updatePushNotification,
} from "../service/pushNotification.service.js";

createResponder(
  NOTIFICATION_PATTERN.PUSH_NOTIFICATION.ADD_PUSH_NOTIFICATION,
  async (data) => {
    return await addPushNotification(data);
  }
);

createResponder(
  NOTIFICATION_PATTERN.PUSH_NOTIFICATION.UPDATE_PUSH_NOTIFICATION,
  async (data) => {
    return await updatePushNotification(data);
  }
);

createResponder(
  NOTIFICATION_PATTERN.PUSH_NOTIFICATION.DELETE_PUSH_NOTIFICATION,
  async (data) => {
    return await deletePushNotification(data);
  }
);

createResponder(
  NOTIFICATION_PATTERN.PUSH_NOTIFICATION.GET_PUSH_NOTIFICATIONS,
  async (data) => {
    return await getPushNotifications(data);
  }
);

createResponder(
  NOTIFICATION_PATTERN.PUSH_NOTIFICATION.SEND_PUSH_NOTIFICATION,
  async (data) => {
    return await sendPushNotification(data);
  }
);
