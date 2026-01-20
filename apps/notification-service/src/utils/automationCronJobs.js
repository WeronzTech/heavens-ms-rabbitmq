import moment from "moment";
import { sendPushNotificationToUser } from "./sendNotificationHelper.js";
import FcmToken from "../models/fcmToken.model.js";
import NotificationLog from "../models/notificationLog.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";

export const runFeeNotificationCron = async () => {
  try {
    const today = moment.utc().startOf("day");

    const response = await sendRPCRequest(USER_PATTERN.USER.GET_USER_IDS, {
      messOnly: true,
      studentOnly: true,
    });
    const students = response.data; // Array of { id, dueDate }

    for (const student of students) {
      const dueDate = moment.utc(student.dueDate).startOf("day");
      const diffDays = dueDate.diff(today, "days");

      let notificationMessage = null;

      if (diffDays === 5) {
        notificationMessage = {
          title: "Fee Reminder",
          body: "Your mess fee is due in 5 days. Please pay to avoid service interruption.",
        };
      } else if (diffDays === 0) {
        notificationMessage = {
          title: "Service Blocked",
          body: "Mess service blocked due to non-payment. Please pay your fees to resume service.",
        };
      }

      if (notificationMessage) {
        const fcmDoc = await FcmToken.findOne({ userId: student.id });
        if (fcmDoc && Array.isArray(fcmDoc.token)) {
          for (const token of fcmDoc.token) {
            try {
              await sendPushNotificationToUser(token, notificationMessage);
              console.log(`Notification sent to ${student.id}`);
            } catch (err) {
              console.error(
                `Failed to send to ${student.id} token ${token}:`,
                err.message
              );
            }
          }
        } else {
          console.warn(`No FCM tokens found for user ${student.id}`);
        }
      }
    }
  } catch (error) {
    console.error("Error in fee notification cron:", error.message);
  }
};

const parseISTTime = (hhmm) => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const nowIST = moment.utc().add(5, "hours").add(30, "minutes");
  return moment
    .utc()
    .add(5, "hours")
    .add(30, "minutes") // current IST date
    .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
};

export const notifyMealTimings = async () => {
  try {
    const nowIST = moment.utc().add(5, "hours").add(30, "minutes");

    const res = await sendRPCRequest(
      INVENTORY_PATTERN.MENU.FETCH_ALL_BOOKING_TIMES,
      {}
    );
    const properties = res?.data || [];
    // console.log("properties", properties);

    for (const property of properties) {
      const { kitchenId, mealTimes = [] } = property;

      const propertyIds = Array.isArray(kitchenId.propertyId)
        ? kitchenId.propertyId
        : [kitchenId.propertyId];

      const studentRes = await Promise.all(
        propertyIds.map((propId) =>
          sendRPCRequest(USER_PATTERN.USER.GET_USERS_BY_RENT_TYPE, {
            propertyId: propId,
            all: true,
          })
        )
      );
      // console.log("studentRes", studentRes);
      const allStudentObjects = studentRes.flatMap(
        (res) => res.body.data || []
      );
      const studentIds = allStudentObjects.map((student) => student._id);
      // console.log("studentIds", studentIds);

      for (const meal of mealTimes) {
        const mealType = meal.mealType;
        const startTime = parseISTTime(meal.start);
        const endTime = parseISTTime(meal.end);
        // console.log(`Processing ${mealType}: ${startTime} - ${endTime} `);

        const diffToStart = startTime.diff(nowIST, "minutes");
        const diffToEnd = endTime.diff(nowIST, "minutes");
        const diffFromStart = nowIST.diff(startTime, "minutes");
        // console.log(
        //   `diffToStart: ${diffToStart}, diffToEnd: ${diffToEnd}, diffFromStart: ${diffFromStart}`
        // );

        let message = null;

        if (diffToStart === 30) {
          message = {
            title: `${mealType} Starting Soon`,
            body: `Your ${mealType} will begin in 30 minutes.`,
          };
        } else if (diffToStart === 0) {
          message = {
            title: `${mealType} Started`,
            body: `Your ${mealType} time has started. Please proceed to the dining area.`,
          };
        } else if (diffToEnd === 30) {
          message = {
            title: `${mealType} Ending Soon`,
            body: `Your ${mealType} time will end in 30 minutes. Please finish your meal.`,
          };
        }

        if (message) {
          for (const studentId of studentIds) {
            const fcmDoc = await FcmToken.findOne({ userId: studentId });
            if (fcmDoc?.token?.length) {
              for (const token of fcmDoc.token) {
                try {
                  await sendPushNotificationToUser(token, message);
                  console.log(`✅ Sent "${message.title}" to ${studentId}`);
                } catch (err) {
                  console.error(
                    `❌ Error sending to ${studentId}: ${err.message}`
                  );
                }
              }
            } else {
              console.warn(`⚠️ No FCM token for student ${studentId}`);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("🚨 Error in meal notification cron:", err.message);
  }
};

export const deleteOldNotifications = async () => {
  console.log("Running cron job: Deleting old notification logs...");

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await NotificationLog.deleteMany({
      createdAt: { $lte: sevenDaysAgo },
    });

    if (result.deletedCount > 0) {
      console.log(
        `Successfully deleted ${result.deletedCount} old notification logs.`
      );
    } else {
      console.log("No old notification logs to delete.");
    }
  } catch (error) {
    console.error("Error deleting old notification logs:", error.message);
  }
};
