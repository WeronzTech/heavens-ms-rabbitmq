import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../libs/patterns/notification/notification.pattern.js";
import { getNotificationLogs, saveFcmToken, sendNotification } from "../service/notification.service.js";


createResponder(
  NOTIFICATION_PATTERN.NOTIFICATION.SAVE_FCM_TOKEN,
  async (data) => {
    return await saveFcmToken(data);
  }
);

createResponder(
  NOTIFICATION_PATTERN.NOTIFICATION.SEND_NOTIFICATION,
  async (data) => {
    return await sendNotification(data);
  }
);

createResponder(
  NOTIFICATION_PATTERN.NOTIFICATION.GET_NOTIFICATION_LOGS,
  async (data) => {
    return await getNotificationLogs(data);
  }
);


