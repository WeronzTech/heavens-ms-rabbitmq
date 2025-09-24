import User from "../models/user.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../libs/patterns/notification/notification.pattern.js";

export const sendRentReminders = async () => {
  console.log("Running cron job: Checking for rent payment reminders...");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);
    fiveDaysFromNow.setHours(23, 59, 59, 999);

    const usersToNotify = await User.find({
      "financialDetails.nextDueDate": {
        $gte: today,
        $lte: fiveDaysFromNow,
      },
      isVacated: false,
      isBlocked: false,
    });

    if (usersToNotify.length === 0) {
      console.log("No users to notify today.");
      return;
    }

    console.log(`Found ${usersToNotify.length} users to notify.`);

    for (const user of usersToNotify) {
      const dueDate = new Date(user.financialDetails.nextDueDate);
      const timeDiff = dueDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

      let description = "";
      if (daysLeft === 0) {
        description = `Hi ${user.name}, your rent payment is due today. Please pay to avoid any inconvenience.`;
      } else if (daysLeft === 1) {
        description = `Hi ${user.name}, your rent payment is due tomorrow. Please pay on time.`;
      } else {
        description = `Hi ${user.name}, your rent payment is due in ${daysLeft} days. Please pay on time to avoid any inconvenience.`;
      }

      const notificationPayload = {
        title: "Rent Payment Reminder",
        description: description,
        userId: user._id.toString(),
      };

      const formData = new FormData();
      formData.append("title", notificationPayload.title);
      formData.append("description", notificationPayload.description);
      formData.append("userId", notificationPayload.userId);

      try {
        await sendRPCRequest(
          NOTIFICATION_PATTERN.NOTIFICATION.SEND_NOTIFICATION,
          {
            data: {
              title: notificationPayload.title,
              description: notificationPayload.description,
              userId: notificationPayload.userId,
            },
          } // ✅ wrapped in data
        );
        console.log(
          `Successfully sent notification to user: ${user.name} (${user._id})`
        );
      } catch (apiError) {
        console.error(
          `Failed to send notification to user ${user._id}:`,
          apiError.response?.data || apiError.message
        );
      }
    }
  } catch (error) {
    console.error(
      "An error occurred during the rent reminder cron job:",
      error
    );
  }
};
