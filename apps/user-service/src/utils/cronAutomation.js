// import User from "../models/user.model.js";
// import {sendRPCRequest} from "../../../../libs/common/rabbitMq.js";
// import {NOTIFICATION_PATTERN} from "../../../../libs/patterns/notification/notification.pattern.js";
// import moment from "moment";

// export const sendRentReminders = async () => {
//   console.log(
//     "Running daily job: Updating overdue rent for all monthly users...",
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
//       "financialDetails.clearedTillMonth": {$exists: true, $ne: null},
//     });

//     for (const user of usersToCheck) {
//       const {
//         clearedTillMonth,
//         monthlyRent,
//         pendingRent: currentPendingRentInDB,
//         pendingAmount,
//         advanceBalance,
//       } = user.financialDetails;

//       if (!monthlyRent || monthlyRent <= 0) continue;

//       // 2. Calculate Billing Day based on IST Join Date
//       // This fixes the issue where UTC servers might see the date as one day prior
//       const joinDateMoment = user.stayDetails?.joinDate
//         ? moment(user.stayDetails.joinDate).utcOffset("+05:30")
//         : moment(user.createdAt).utcOffset("+05:30");

//       const billingDay = joinDateMoment.date(); // e.g., 15

//       // 3. Start checking from the month AFTER the last cleared month
//       // Ensure iteration month is also parsed in IST context to avoid month rollover issues
//       let iterationMonth = moment(clearedTillMonth, "YYYY-MM")
//         .utcOffset("+05:30")
//         .add(1, "months")
//         .startOf("month");

//       const monthsCoveredByPending =
//         pendingAmount > 0 ? Math.ceil(pendingAmount / monthlyRent) : 0;

//       // 2. Start the total with the existing partial/pending amount.
//       let correctlyCalculatedPendingRent =
//         pendingAmount > 0 ? pendingAmount : 0;

//       let monthAddedLog = [];
//       let validDueMonthsCount = 0; // Counts how many due dates have actually passed
//       // <--- CHANGE END -------------------------------------------------------

//       while (iterationMonth.isSameOrBefore(today, "month")) {
//         const specificDueDate = iterationMonth
//           .clone()
//           .date(billingDay)
//           .startOf("day");

//         // <--- CHANGE START: Strict Date Check --------------------------------
//         // Only process this month if the specific due date has been reached/passed
//         if (today.isSameOrAfter(specificDueDate, "day")) {
//           validDueMonthsCount++; // We found a valid overdue month

//           if (validDueMonthsCount > monthsCoveredByPending) {
//             correctlyCalculatedPendingRent += monthlyRent;
//             monthAddedLog.push(iterationMonth.format("YYYY-MM"));
//           } else {
//             monthAddedLog.push(
//               `${iterationMonth.format("YYYY-MM")} (Covered by PendingAmount)`,
//             );
//           }

//           console.log(
//             "Here---------------------",
//             user.name,
//             specificDueDate.format(),
//             correctlyCalculatedPendingRent,
//           );
//           // correctlyCalculatedPendingRent += monthlyRent;
//           // monthAddedLog.push(iterationMonth.format("YYYY-MM"));
//         } else {
//           console.log(
//             "Here-----------again---------------------",
//             user.name,
//             specificDueDate.format(),
//           );
//           console.log(
//             `[DEBUG] Skipping Rent for ${user.name} for ${iterationMonth.format(
//               "MMM YYYY",
//             )}. Due: ${specificDueDate.format(
//               "YYYY-MM-DD",
//             )}, Today: ${today.format("YYYY-MM-DD")}`,
//           );
//         }

//         // Move to check the next month
//         iterationMonth.add(1, "months");
//       }

//       let updatedAdvanceBalance = advanceBalance || 0;

//       if (updatedAdvanceBalance > 0 && correctlyCalculatedPendingRent > 0) {
//         if (updatedAdvanceBalance >= correctlyCalculatedPendingRent) {
//           // Advance fully clears pending
//           updatedAdvanceBalance -= correctlyCalculatedPendingRent;
//           monthAddedLog.push(
//             `(Advance used: -${correctlyCalculatedPendingRent})`,
//           );
//           correctlyCalculatedPendingRent = 0;
//         } else {
//           // Advance partially reduces pending
//           correctlyCalculatedPendingRent -= updatedAdvanceBalance;
//           monthAddedLog.push(`(Advance used: -${updatedAdvanceBalance})`);
//           updatedAdvanceBalance = 0;
//         }
//       }

//       // Log for specific users to debug production issues
//       if (user.name === "Praveen S" || user.name === "Jithin N") {
//         console.log(
//           `[DEBUG-USER] ${
//             user.name
//           } | BillingDay: ${billingDay} | PendingRent Calc: ${correctlyCalculatedPendingRent} | Months: ${monthAddedLog.join(
//             ", ",
//           )}`,
//         );
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
//         const dueDate = moment(user.financialDetails.nextDueDate)
//           .utcOffset("+05:30")
//           .startOf("day");
//         const standardBlockThreshold = dueDate.clone().add(5, "days");

//         // 2. Extension Logic Setup: Check if a special extension date exists
//         let isExtensionApplicable = false;
//         let extensionDateMoment = null;

//         if (user.isAccessBlockExtendDate) {
//           extensionDateMoment = moment(user.isAccessBlockExtendDate)
//             .utcOffset("+05:30")
//             .startOf("day");

//           // Check if the extension date is in the CURRENT month relative to 'today'
//           if (extensionDateMoment.isSame(today, "month")) {
//             isExtensionApplicable = true;
//           }
//         }

//         // 3. Decision Matrix
//         if (isExtensionApplicable) {
//           // --- SCENARIO A: Extension exists for this month ---
//           // Block ONLY if today is strictly after the specific extension date
//           if (today.isAfter(extensionDateMoment, "day")) {
//             shouldBlockUser = true;
//             // blockReason = `Extension date (${extensionDateMoment.format(
//             //   "YYYY-MM-DD"
//             // )}) passed`;
//           }
//         } else {
//           // --- SCENARIO B: No extension OR extension is for a different month ---
//           // Block if today is strictly after the standard 5-day grace period
//           if (today.isAfter(standardBlockThreshold, "day")) {
//             shouldBlockUser = true;
//             // blockReason = "Standard 5-day grace period passed";
//           }
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
//         user.financialDetails.pendingAmount = correctlyCalculatedPendingRent;
//         user.financialDetails.advanceBalance = updatedAdvanceBalance;

//         // Also update payment status if they are now pending
//         if (correctlyCalculatedPendingRent > 0) {
//           console.log("Here----today---------------------", user.name);
//           user.paymentStatus = "pending";
//         } else {
//           user.paymentStatus = "paid";
//         }

//         if (shouldBlockUser) {
//           user.isBlocked = true;
//           console.log(
//             `Blocking user ${user.name} (ID: ${user._id}) due to overdue rent > 5 days.`,
//           );
//         }

//         await user.save();
//         console.log(
//           `Corrected overdue rent for ${
//             user.name
//           } to ₹${correctlyCalculatedPendingRent}. Reasons: ${monthAddedLog.join(
//             ", ",
//           )}`,
//         );
//       }
//     }
//   } catch (error) {
//     console.error(
//       "An error occurred during the overdue rent update part of the cron job:",
//       error,
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

//       // ... RPC request logic remains same ...
//       try {
//         await sendRPCRequest(
//           NOTIFICATION_PATTERN.NOTIFICATION.SEND_NOTIFICATION,
//           {
//             data: {
//               title: notificationPayload.title,
//               description: notificationPayload.description,
//               userId: notificationPayload.userId,
//             },
//           },
//         );
//         console.log(
//           `Successfully sent notification to user: ${user.name} (${user._id})`,
//         );
//       } catch (apiError) {
//         console.error(
//           `Failed to send notification to user ${user._id}:`,
//           apiError.response?.data || apiError.message,
//         );
//       }
//     }
//   } catch (error) {
//     console.error(
//       "An error occurred during the rent reminder cron job:",
//       error,
//     );
//   }
// };

import User from "../models/user.model.js";
import {sendRPCRequest} from "../../../../libs/common/rabbitMq.js";
import {NOTIFICATION_PATTERN} from "../../../../libs/patterns/notification/notification.pattern.js";
import moment from "moment";

export const sendRentReminders = async () => {
  console.log(
    "Running daily job: Updating overdue rent for all monthly users...",
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
      "financialDetails.clearedTillMonth": {$exists: true, $ne: null},
    });

    for (const user of usersToCheck) {
      const {
        clearedTillMonth,
        monthlyRent,
        pendingRent: currentPendingRentInDB,
        pendingAmount,
        advanceBalance,
      } = user.financialDetails;

      if (!monthlyRent || monthlyRent <= 0) continue;

      // 2. Calculate Billing Day (1st of every month)
      const billingDay = 1;

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

          if (validDueMonthsCount > monthsCoveredByPending) {
            correctlyCalculatedPendingRent += monthlyRent;
            monthAddedLog.push(iterationMonth.format("YYYY-MM"));
          } else {
            monthAddedLog.push(
              `${iterationMonth.format("YYYY-MM")} (Covered by PendingAmount)`,
            );
          }

          console.log(
            "Here---------------------",
            user.name,
            specificDueDate.format(),
            correctlyCalculatedPendingRent,
          );
          // correctlyCalculatedPendingRent += monthlyRent;
          // monthAddedLog.push(iterationMonth.format("YYYY-MM"));
        } else {
          console.log(
            "Here-----------again---------------------",
            user.name,
            specificDueDate.format(),
          );
          console.log(
            `[DEBUG] Skipping Rent for ${user.name} for ${iterationMonth.format(
              "MMM YYYY",
            )}. Due: ${specificDueDate.format(
              "YYYY-MM-DD",
            )}, Today: ${today.format("YYYY-MM-DD")}`,
          );
        }

        // Move to check the next month
        iterationMonth.add(1, "months");
      }

      let updatedAdvanceBalance = advanceBalance || 0;

      if (updatedAdvanceBalance > 0 && correctlyCalculatedPendingRent > 0) {
        if (updatedAdvanceBalance >= correctlyCalculatedPendingRent) {
          // Advance fully clears pending
          updatedAdvanceBalance -= correctlyCalculatedPendingRent;
          monthAddedLog.push(
            `(Advance used: -${correctlyCalculatedPendingRent})`,
          );
          correctlyCalculatedPendingRent = 0;
        } else {
          // Advance partially reduces pending
          correctlyCalculatedPendingRent -= updatedAdvanceBalance;
          monthAddedLog.push(`(Advance used: -${updatedAdvanceBalance})`);
          updatedAdvanceBalance = 0;
        }
      }

      // Log for specific users to debug production issues
      if (user.name === "Praveen S" || user.name === "Jithin N") {
        console.log(
          `[DEBUG-USER] ${
            user.name
          } | BillingDay: ${billingDay} | PendingRent Calc: ${correctlyCalculatedPendingRent} | Months: ${monthAddedLog.join(
            ", ",
          )}`,
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
        const dueDate = moment(user.financialDetails.nextDueDate)
          .utcOffset("+05:30")
          .startOf("day");
        const standardBlockThreshold = dueDate.clone().add(5, "days");

        // 2. Extension Logic Setup: Check if a special extension date exists
        let isExtensionApplicable = false;
        let extensionDateMoment = null;

        if (user.isAccessBlockExtendDate) {
          extensionDateMoment = moment(user.isAccessBlockExtendDate)
            .utcOffset("+05:30")
            .startOf("day");

          // Check if the extension date is in the CURRENT month relative to 'today'
          if (extensionDateMoment.isSame(today, "month")) {
            isExtensionApplicable = true;
          }
        }

        // 3. Decision Matrix
        if (isExtensionApplicable) {
          // --- SCENARIO A: Extension exists for this month ---
          // Block ONLY if today is strictly after the specific extension date
          if (today.isAfter(extensionDateMoment, "day")) {
            shouldBlockUser = true;
            // blockReason = `Extension date (${extensionDateMoment.format(
            //   "YYYY-MM-DD"
            // )}) passed`;
          }
        } else {
          // --- SCENARIO B: No extension OR extension is for a different month ---
          // Block if today is strictly after the standard 5-day grace period
          if (today.isAfter(standardBlockThreshold, "day")) {
            shouldBlockUser = true;
            // blockReason = "Standard 5-day grace period passed";
          }
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
        user.financialDetails.pendingAmount = correctlyCalculatedPendingRent;
        user.financialDetails.advanceBalance = updatedAdvanceBalance;

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
            `Blocking user ${user.name} (ID: ${user._id}) due to overdue rent > 5 days.`,
          );
        }

        await user.save();
        console.log(
          `Corrected overdue rent for ${
            user.name
          } to ₹${correctlyCalculatedPendingRent}. Reasons: ${monthAddedLog.join(
            ", ",
          )}`,
        );
      }
    }
  } catch (error) {
    console.error(
      "An error occurred during the overdue rent update part of the cron job:",
      error,
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
          },
        );
        console.log(
          `Successfully sent notification to user: ${user.name} (${user._id})`,
        );
      } catch (apiError) {
        console.error(
          `Failed to send notification to user ${user._id}:`,
          apiError.response?.data || apiError.message,
        );
      }
    }
  } catch (error) {
    console.error(
      "An error occurred during the rent reminder cron job:",
      error,
    );
  }
};
