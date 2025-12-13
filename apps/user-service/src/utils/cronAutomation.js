import User from "../models/user.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../libs/patterns/notification/notification.pattern.js";
import moment from "moment";

export const sendRentReminders = async () => {
  console.log(
    "Running daily job: Updating overdue rent for all monthly users..."
  );
  try {
    const today = moment();

    // ✅ **CORRECTED LOGIC**: Fetch ALL active monthly users to recalculate their dues.
    const usersToCheck = await User.find({
      rentType: "monthly",
      isVacated: false,
      isBlocked: false,
      "financialDetails.clearedTillMonth": { $exists: true, $ne: null },
    });

    for (const user of usersToCheck) {
      const {
        clearedTillMonth,
        monthlyRent,
        pendingRent: currentPendingRentInDB,
      } = user.financialDetails;

      if (!monthlyRent || monthlyRent <= 0) continue;

      const joinDateMoment = user.stayDetails?.joinDate
        ? moment(user.stayDetails.joinDate)
        : moment(user.createdAt);

      const billingDay = joinDateMoment.date(); // e.g., 15

      // 2. Start checking from the month AFTER the last cleared month
      let iterationMonth = moment(clearedTillMonth, "YYYY-MM").add(1, "months");
      let correctlyCalculatedPendingRent = 0;

      // 3. Loop while the iteration month is in the past or is the current month
      while (iterationMonth.isSameOrBefore(today, "month")) {
        // Construct the specific due date for this month
        // moment().date(X) handles edge cases (e.g., setting 31st on Feb becomes Feb 28/29)
        const specificDueDate = iterationMonth.clone().date(billingDay);

        // 4. CHECK: Has today passed (or is it) this specific due date?
        if (today.isSameOrAfter(specificDueDate, "day")) {
          correctlyCalculatedPendingRent += monthlyRent;
        }

        // Move to check the next month
        iterationMonth.add(1, "months");
      }

      const rentAmountChanged =
        correctlyCalculatedPendingRent !== (currentPendingRentInDB || 0);
      const statusShouldBePaid =
        correctlyCalculatedPendingRent === 0 && user.paymentStatus !== "paid";
      const statusShouldBePending =
        correctlyCalculatedPendingRent > 0 && user.paymentStatus !== "pending";

      // If amount changed OR status is inconsistent, update DB
      if (rentAmountChanged || statusShouldBePaid || statusShouldBePending) {
        user.financialDetails.pendingRent = correctlyCalculatedPendingRent;
        // Also update payment status if they are now pending
        if (correctlyCalculatedPendingRent > 0) {
          user.paymentStatus = "pending";
        } else {
          user.paymentStatus = "paid";
        }
        await user.save();
        console.log(
          `Corrected overdue rent for ${user.name} to ₹${correctlyCalculatedPendingRent}.`
        );
      }
    }
  } catch (error) {
    console.error(
      "An error occurred during the overdue rent update part of the cron job:",
      error
    );
  }

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
