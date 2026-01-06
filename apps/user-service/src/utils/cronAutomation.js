// import User from "../models/user.model.js";
// import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
// import { NOTIFICATION_PATTERN } from "../../../../libs/patterns/notification/notification.pattern.js";
// import moment from "moment";

// export const sendRentReminders = async () => {
//   console.log(
//     "Running daily job: Updating overdue rent for all monthly users..."
//   );
//   try {
//     const today = moment();

//     // ✅ **CORRECTED LOGIC**: Fetch ALL active monthly users to recalculate their dues.
//     const usersToCheck = await User.find({
//       rentType: "monthly",
//       isVacated: false,
//       isBlocked: false,
//       "financialDetails.clearedTillMonth": { $exists: true, $ne: null },
//     });

//     for (const user of usersToCheck) {
//       const {
//         clearedTillMonth,
//         monthlyRent,
//         pendingRent: currentPendingRentInDB,
//       } = user.financialDetails;

//       if (!monthlyRent || monthlyRent <= 0) continue;

//       const joinDateMoment = user.stayDetails?.joinDate
//         ? moment(user.stayDetails.joinDate)
//         : moment(user.createdAt);

//       const billingDay = joinDateMoment.date(); // e.g., 15

//       // 2. Start checking from the month AFTER the last cleared month
//       let iterationMonth = moment(clearedTillMonth, "YYYY-MM").add(1, "months");
//       let correctlyCalculatedPendingRent = 0;

//       // 3. Loop while the iteration month is in the past or is the current month
//       while (iterationMonth.isSameOrBefore(today, "month")) {
//         // Construct the specific due date for this month
//         // moment().date(X) handles edge cases (e.g., setting 31st on Feb becomes Feb 28/29)
//         const specificDueDate = iterationMonth.clone().date(billingDay);
//         console.log("specificDueDate", specificDueDate, user.name);

//         // 4. CHECK: Has today passed (or is it) this specific due date?
//         if (today.isSameOrAfter(specificDueDate, "day")) {
//           correctlyCalculatedPendingRent += monthlyRent;
//         }

//         // Move to check the next month
//         iterationMonth.add(1, "months");
//       }

//       const rentAmountChanged =
//         correctlyCalculatedPendingRent !== (currentPendingRentInDB || 0);
//       const statusShouldBePaid =
//         correctlyCalculatedPendingRent === 0 && user.paymentStatus !== "paid";
//       const statusShouldBePending =
//         correctlyCalculatedPendingRent > 0 && user.paymentStatus !== "pending";

//       let shouldBlockUser = false;
//       if (
//         correctlyCalculatedPendingRent > 0 &&
//         user.financialDetails.nextDueDate
//       ) {
//         const dueDate = moment(user.financialDetails.nextDueDate);
//         // Calculate the cut-off date (Due Date + 5 Days)
//         const blockThresholdDate = dueDate.clone().add(5, "days");

//         // If today is strictly after the 5-day grace period
//         if (today.isAfter(blockThresholdDate, "day")) {
//           shouldBlockUser = true;
//         }
//       }

//       // If amount changed OR status is inconsistent, update DB
//       if (
//         rentAmountChanged ||
//         statusShouldBePaid ||
//         statusShouldBePending ||
//         shouldBlockUser
//       ) {
//         user.financialDetails.pendingRent = correctlyCalculatedPendingRent;
//         // Also update payment status if they are now pending
//         if (correctlyCalculatedPendingRent > 0) {
//           user.paymentStatus = "pending";
//         } else {
//           user.paymentStatus = "paid";
//         }

//         if (shouldBlockUser) {
//           user.isBlocked = true;
//           console.log(
//             `Blocking user ${user.name} (ID: ${user._id}) due to overdue rent > 5 days.`
//           );
//         }

//         await user.save();
//         console.log(
//           `Corrected overdue rent for ${user.name} to ₹${correctlyCalculatedPendingRent}.`
//         );
//       }
//     }
//   } catch (error) {
//     console.error(
//       "An error occurred during the overdue rent update part of the cron job:",
//       error
//     );
//   }

//   console.log("Running cron job: Checking for rent payment reminders...");

//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const fiveDaysFromNow = new Date(today);
//     fiveDaysFromNow.setDate(today.getDate() + 5);
//     fiveDaysFromNow.setHours(23, 59, 59, 999);

//     const usersToNotify = await User.find({
//       "financialDetails.nextDueDate": {
//         $gte: today,
//         $lte: fiveDaysFromNow,
//       },
//       isVacated: false,
//       isBlocked: false,
//     });

//     if (usersToNotify.length === 0) {
//       console.log("No users to notify today.");
//       return;
//     }

//     console.log(`Found ${usersToNotify.length} users to notify.`);

//     for (const user of usersToNotify) {
//       const dueDate = new Date(user.financialDetails.nextDueDate);
//       const timeDiff = dueDate.getTime() - today.getTime();
//       const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

//       let description = "";
//       if (daysLeft === 0) {
//         description = `Hi ${user.name}, your rent payment is due today. Please pay to avoid any inconvenience.`;
//       } else if (daysLeft === 1) {
//         description = `Hi ${user.name}, your rent payment is due tomorrow. Please pay on time.`;
//       } else {
//         description = `Hi ${user.name}, your rent payment is due in ${daysLeft} days. Please pay on time to avoid any inconvenience.`;
//       }

//       const notificationPayload = {
//         title: "Rent Payment Reminder",
//         description: description,
//         userId: user._id.toString(),
//       };

//       const formData = new FormData();
//       formData.append("title", notificationPayload.title);
//       formData.append("description", notificationPayload.description);
//       formData.append("userId", notificationPayload.userId);

//       try {
//         await sendRPCRequest(
//           NOTIFICATION_PATTERN.NOTIFICATION.SEND_NOTIFICATION,
//           {
//             data: {
//               title: notificationPayload.title,
//               description: notificationPayload.description,
//               userId: notificationPayload.userId,
//             },
//           } // ✅ wrapped in data
//         );
//         console.log(
//           `Successfully sent notification to user: ${user.name} (${user._id})`
//         );
//       } catch (apiError) {
//         console.error(
//           `Failed to send notification to user ${user._id}:`,
//           apiError.response?.data || apiError.message
//         );
//       }
//     }
//   } catch (error) {
//     console.error(
//       "An error occurred during the rent reminder cron job:",
//       error
//     );
//   }
// };
import User from "../models/user.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { NOTIFICATION_PATTERN } from "../../../../libs/patterns/notification/notification.pattern.js";
import moment from "moment";

export const sendRentReminders = async () => {
  console.log(
    "Running daily job: Updating overdue rent for all monthly users..."
  );
  try {
    // 1. Force TODAY to be IST (UTC+05:30) and start of day to avoid time discrepancies
    const today = moment().utcOffset("+05:30").startOf("day");
    console.log(`[DEBUG] System Time: ${new Date().toISOString()}`);
    console.log(`[DEBUG] Calculated 'Today' (IST): ${today.format()}`);

    // Fetch ALL active monthly users to recalculate their dues.
    const usersToCheck = await User.find({
      rentType: "monthly",
      isVacated: false,
      // isBlocked: false,
      "financialDetails.clearedTillMonth": { $exists: true, $ne: null },
    });

    for (const user of usersToCheck) {
      const {
        clearedTillMonth,
        monthlyRent,
        pendingRent: currentPendingRentInDB,
        pendingAmount,
      } = user.financialDetails;

      if (!monthlyRent || monthlyRent <= 0) continue;

      // 2. Calculate Billing Day based on IST Join Date
      // This fixes the issue where UTC servers might see the date as one day prior
      const joinDateMoment = user.stayDetails?.joinDate
        ? moment(user.stayDetails.joinDate).utcOffset("+05:30")
        : moment(user.createdAt).utcOffset("+05:30");

      const billingDay = joinDateMoment.date(); // e.g., 15

      // 3. Start checking from the month AFTER the last cleared month
      // Ensure iteration month is also parsed in IST context to avoid month rollover issues
      let iterationMonth = moment(clearedTillMonth, "YYYY-MM")
        .utcOffset("+05:30")
        .add(1, "months")
        .startOf("month");

      const monthsCoveredByPending =
        pendingAmount > 0 ? Math.ceil(pendingAmount / monthlyRent) : 0;

      // 2. Start the total with the existing partial/pending amount.
      let correctlyCalculatedPendingRent =
        pendingAmount > 0 ? pendingAmount : 0;

      let monthAddedLog = [];
      let validDueMonthsCount = 0; // Counts how many due dates have actually passed
      // <--- CHANGE END -------------------------------------------------------

      while (iterationMonth.isSameOrBefore(today, "month")) {
        const specificDueDate = iterationMonth
          .clone()
          .date(billingDay)
          .startOf("day");

        // <--- CHANGE START: Strict Date Check --------------------------------
        // Only process this month if the specific due date has been reached/passed
        if (today.isSameOrAfter(specificDueDate, "day")) {
          validDueMonthsCount++; // We found a valid overdue month

          // console.log(
          //   "monthsCoveredByPending",
          //   monthsCoveredByPending,
          //   validDueMonthsCount,
          //   correctlyCalculatedPendingRent
          // );
          // Check: Is this valid month "extra" beyond what pendingAmount covers?
          // Example: 9000 covers 1 month.
          // - Dec 1st passed: validDueMonthsCount = 1. (1 > 1 is False). Don't add rent.
          // - Jan 1st passed: validDueMonthsCount = 2. (2 > 1 is True). Add 6500.
          if (validDueMonthsCount > monthsCoveredByPending) {
            correctlyCalculatedPendingRent += monthlyRent;
            monthAddedLog.push(iterationMonth.format("YYYY-MM"));
          } else {
            monthAddedLog.push(
              `${iterationMonth.format("YYYY-MM")} (Covered by PendingAmount)`
            );
          }

          console.log(
            "Here---------------------",
            user.name,
            specificDueDate.format(),
            correctlyCalculatedPendingRent
          );
          // correctlyCalculatedPendingRent += monthlyRent;
          // monthAddedLog.push(iterationMonth.format("YYYY-MM"));
        } else {
          console.log(
            "Here-----------again---------------------",
            user.name,
            specificDueDate.format()
          );
          console.log(
            `[DEBUG] Skipping Rent for ${user.name} for ${iterationMonth.format(
              "MMM YYYY"
            )}. Due: ${specificDueDate.format(
              "YYYY-MM-DD"
            )}, Today: ${today.format("YYYY-MM-DD")}`
          );
        }

        // Move to check the next month
        iterationMonth.add(1, "months");
      }

      // Log for specific users to debug production issues
      if (user.name === "Praveen S" || user.name === "Jithin N") {
        console.log(
          `[DEBUG-USER] ${
            user.name
          } | BillingDay: ${billingDay} | PendingRent Calc: ${correctlyCalculatedPendingRent} | Months: ${monthAddedLog.join(
            ", "
          )}`
        );
      }

      const rentAmountChanged =
        correctlyCalculatedPendingRent !== (currentPendingRentInDB || 0);
      const statusShouldBePaid =
        correctlyCalculatedPendingRent === 0 && user.paymentStatus !== "paid";
      const statusShouldBePending =
        correctlyCalculatedPendingRent > 0 && user.paymentStatus !== "pending";

      let shouldBlockUser = false;
      if (
        correctlyCalculatedPendingRent > 0 &&
        user.financialDetails.nextDueDate
      ) {
        // Calculate block threshold using IST
        const dueDate = moment(user.financialDetails.nextDueDate)
          .utcOffset("+05:30")
          .startOf("day");
        // Calculate the cut-off date (Due Date + 5 Days)
        const blockThresholdDate = dueDate.clone().add(5, "days");

        // If today is strictly after the 5-day grace period
        if (today.isAfter(blockThresholdDate, "day")) {
          shouldBlockUser = true;
        }
      }

      // If amount changed OR status is inconsistent, update DB
      if (
        rentAmountChanged ||
        statusShouldBePaid ||
        statusShouldBePending ||
        shouldBlockUser
      ) {
        user.financialDetails.pendingRent = correctlyCalculatedPendingRent;
        // Also update payment status if they are now pending
        if (correctlyCalculatedPendingRent > 0) {
          console.log("Here----today---------------------", user.name);
          user.paymentStatus = "pending";
        } else {
          user.paymentStatus = "paid";
        }

        if (shouldBlockUser) {
          user.isBlocked = true;
          console.log(
            `Blocking user ${user.name} (ID: ${user._id}) due to overdue rent > 5 days.`
          );
        }

        await user.save();
        console.log(
          `Corrected overdue rent for ${
            user.name
          } to ₹${correctlyCalculatedPendingRent}. Reasons: ${monthAddedLog.join(
            ", "
          )}`
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
    const today = moment().utcOffset("+05:30").startOf("day");

    // Convert to Date objects for Mongo Query
    const todayDate = today.toDate();
    const fiveDaysFromNow = today.clone().add(5, "days").endOf("day").toDate();

    const usersToNotify = await User.find({
      "financialDetails.nextDueDate": {
        $gte: todayDate,
        $lte: fiveDaysFromNow,
      },
      isVacated: false,
      // isBlocked: false,
    });

    if (usersToNotify.length === 0) {
      console.log("No users to notify today.");
      return;
    }

    console.log(`Found ${usersToNotify.length} users to notify.`);

    for (const user of usersToNotify) {
      // Ensure diff calculation is timezone safe
      const dueDate = moment(user.financialDetails.nextDueDate)
        .utcOffset("+05:30")
        .startOf("day");
      const timeDiff = dueDate.diff(today, "days");
      const daysLeft = Math.ceil(timeDiff);

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

      // ... RPC request logic remains same ...
      try {
        await sendRPCRequest(
          NOTIFICATION_PATTERN.NOTIFICATION.SEND_NOTIFICATION,
          {
            data: {
              title: notificationPayload.title,
              description: notificationPayload.description,
              userId: notificationPayload.userId,
            },
          }
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

// import User from "../models/user.model.js";
// import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
// import { NOTIFICATION_PATTERN } from "../../../../libs/patterns/notification/notification.pattern.js";
// import moment from "moment";

// export const sendRentReminders = async () => {
//   console.log(
//     "Running daily job: Updating overdue rent for all monthly users..."
//   );
//   try {
//     // 1. Force TODAY to be IST (UTC+05:30) and start of day to avoid time discrepancies
//     const today = moment().utcOffset("+05:30").startOf("day");
//     console.log(`[DEBUG] System Time: ${new Date().toISOString()}`);
//     console.log(`[DEBUG] Calculated 'Today' (IST): ${today.format()}`);

//     // Fetch ALL active monthly users to recalculate their dues.
//     const usersToCheck = await User.find({
//       rentType: "monthly",
//       isVacated: false,
//       // isBlocked: false,
//       "financialDetails.clearedTillMonth": { $exists: true, $ne: null },
//     });

//     for (const user of usersToCheck) {
//       const {
//         clearedTillMonth,
//         monthlyRent,
//         pendingRent: currentPendingRentInDB,
//       } = user.financialDetails;

//       if (!monthlyRent || monthlyRent <= 0) continue;

//       // 2. Calculate Billing Day based on IST Join Date
//       const joinDateMoment = user.stayDetails?.joinDate
//         ? moment(user.stayDetails.joinDate).utcOffset("+05:30")
//         : moment(user.createdAt).utcOffset("+05:30");

//       const billingDay = joinDateMoment.date(); // e.g., 15

//       // 3. Start checking from the month AFTER the last cleared month
//       let iterationMonth = moment(clearedTillMonth, "YYYY-MM")
//         .utcOffset("+05:30")
//         .add(1, "months")
//         .startOf("month");

//       let monthsShouldBeDueCount = 0; // Count of months that have passed due date
//       let monthAddedLog = []; // For debug logging

//       // 4. Loop while the iteration month is in the past or is the current month
//       while (iterationMonth.isSameOrBefore(today, "month")) {
//         // Construct the specific due date for this month
//         const specificDueDate = iterationMonth
//           .clone()
//           .date(billingDay)
//           .startOf("day");

//         // 5. CHECK: Has today passed (or is it) this specific due date?
//         if (today.isSameOrAfter(specificDueDate, "day")) {
//           // Instead of adding rent immediately, we count this as a "Due Month"
//           monthsShouldBeDueCount++;
//           monthAddedLog.push(iterationMonth.format("YYYY-MM"));
//         }

//         // Move to check the next month
//         iterationMonth.add(1, "months");
//       }

//       // --- 🟢 FIX START: INCREMENTAL LOGIC 🟢 ---

//       // Calculate how many months of rent are arguably already "inside" the current pending debt.
//       // Math.ceil ensures that even a small partial balance counts as "active billing" for that month.
//       // Example: Pending 3000, Rent 6500. ceil(0.46) = 1. We assume 1 month is already billed.
//       const currentDebt = currentPendingRentInDB || 0;
//       const impliedMonthsInDebt = Math.ceil(currentDebt / monthlyRent);

//       // Determine if we need to add NEW rent.
//       // Example: Calendar says 2 months due. Debt has 1 month worth. Add 1 month rent.
//       const monthsToAdd = Math.max(
//         0,
//         monthsShouldBeDueCount - impliedMonthsInDebt
//       );

//       // --- DEBUGGING FOR SPECIFIC USERS ---
//       const debugTargetUsers = [
//         "Gokul M K",
//         "Fathima Hanna",
//         "Hanna Mehabin",
//         "Muhammed Anees Hayath",
//         "Afuw M V",
//         "Muhammed Nidan C",
//         "Jithin N",
//       ];

//       if (debugTargetUsers.includes(user.name)) {
//         console.log(`[DEBUG-TARGET] User: ${user.name}
//          - BillingDay: ${billingDay}
//          - ClearedTill: ${clearedTillMonth}
//          - CurrentDebt (DB): ${currentDebt}
//          - MonthlyRent: ${monthlyRent}
//          - ImpliedMonthsInDebt (Math.ceil(Debt/Rent)): ${impliedMonthsInDebt}
//          - CalendarMonthsDue: ${monthsShouldBeDueCount} (${monthAddedLog.join(
//           ", "
//         )})
//          - MonthsToAdd: ${monthsToAdd}
//          `);
//       }
//       // ------------------------------------

//       let finalPendingRent = currentDebt;
//       let rentAmountChanged = false;

//       if (monthsToAdd > 0) {
//         const rentToAdd = monthsToAdd * monthlyRent;
//         finalPendingRent += rentToAdd;
//         rentAmountChanged = true;

//         console.log(
//           `[CALCULATION] ${user.name}: MonthsDue=${monthsShouldBeDueCount}, ImpliedInDb=${impliedMonthsInDebt}, Adding=${monthsToAdd} months (₹${rentToAdd})`
//         );
//       }

//       // --- 🟢 FIX END 🟢 ---

//       const statusShouldBePaid =
//         finalPendingRent === 0 && user.paymentStatus !== "paid";
//       const statusShouldBePending =
//         finalPendingRent > 0 && user.paymentStatus !== "pending";

//       let shouldBlockUser = false;
//       if (finalPendingRent > 0 && user.financialDetails.nextDueDate) {
//         // Calculate block threshold using IST
//         const dueDate = moment(user.financialDetails.nextDueDate)
//           .utcOffset("+05:30")
//           .startOf("day");
//         // Calculate the cut-off date (Due Date + 5 Days)
//         const blockThresholdDate = dueDate.clone().add(5, "days");

//         // If today is strictly after the 5-day grace period
//         if (today.isAfter(blockThresholdDate, "day")) {
//           shouldBlockUser = true;
//         }
//       }

//       // If amount changed OR status is inconsistent, update DB
//       if (
//         rentAmountChanged ||
//         statusShouldBePaid ||
//         statusShouldBePending ||
//         shouldBlockUser
//       ) {
//         user.financialDetails.pendingRent = finalPendingRent;

//         // Also update payment status
//         if (finalPendingRent > 0) {
//           user.paymentStatus = "pending";
//         } else {
//           user.paymentStatus = "paid";
//         }

//         if (shouldBlockUser) {
//           user.isBlocked = true;
//           console.log(
//             `Blocking user ${user.name} (ID: ${user._id}) due to overdue rent > 5 days.`
//           );
//         }

//         await user.save();

//         if (rentAmountChanged) {
//           console.log(
//             `Corrected overdue rent for ${
//               user.name
//             } from ₹${currentDebt} to ₹${finalPendingRent}. Added for months: ${monthAddedLog
//               .slice(-monthsToAdd)
//               .join(", ")}`
//           );
//         }
//       }
//     }
//   } catch (error) {
//     console.error(
//       "An error occurred during the overdue rent update part of the cron job:",
//       error
//     );
//   }

//   console.log("Running cron job: Checking for rent payment reminders...");

//   try {
//     const today = moment().utcOffset("+05:30").startOf("day");

//     // Convert to Date objects for Mongo Query
//     const todayDate = today.toDate();
//     const fiveDaysFromNow = today.clone().add(5, "days").endOf("day").toDate();

//     const usersToNotify = await User.find({
//       "financialDetails.nextDueDate": {
//         $gte: todayDate,
//         $lte: fiveDaysFromNow,
//       },
//       isVacated: false,
//       // isBlocked: false,
//     });

//     if (usersToNotify.length === 0) {
//       console.log("No users to notify today.");
//       return;
//     }

//     console.log(`Found ${usersToNotify.length} users to notify.`);

//     for (const user of usersToNotify) {
//       // Ensure diff calculation is timezone safe
//       const dueDate = moment(user.financialDetails.nextDueDate)
//         .utcOffset("+05:30")
//         .startOf("day");
//       const timeDiff = dueDate.diff(today, "days");
//       const daysLeft = Math.ceil(timeDiff);

//       let description = "";
//       if (daysLeft === 0) {
//         description = `Hi ${user.name}, your rent payment is due today. Please pay to avoid any inconvenience.`;
//       } else if (daysLeft === 1) {
//         description = `Hi ${user.name}, your rent payment is due tomorrow. Please pay on time.`;
//       } else {
//         description = `Hi ${user.name}, your rent payment is due in ${daysLeft} days. Please pay on time to avoid any inconvenience.`;
//       }

//       const notificationPayload = {
//         title: "Rent Payment Reminder",
//         description: description,
//         userId: user._id.toString(),
//       };

//       try {
//         await sendRPCRequest(
//           NOTIFICATION_PATTERN.NOTIFICATION.SEND_NOTIFICATION,
//           {
//             data: {
//               title: notificationPayload.title,
//               description: notificationPayload.description,
//               userId: notificationPayload.userId,
//             },
//           }
//         );
//         console.log(
//           `Successfully sent notification to user: ${user.name} (${user._id})`
//         );
//       } catch (apiError) {
//         console.error(
//           `Failed to send notification to user ${user._id}:`,
//           apiError.response?.data || apiError.message
//         );
//       }
//     }
//   } catch (error) {
//     console.error(
//       "An error occurred during the rent reminder cron job:",
//       error
//     );
//   }
// };
