// export const generateMonthlySalaries = async () => {
//   try {
//     const previousMonth = moment().subtract(1, "months");
//     const previousMonthStart = previousMonth.clone().startOf("month").toDate();
//     const previousMonthEnd = previousMonth.clone().endOf("month").toDate();
//     const daysInPreviousMonth = previousMonth.daysInMonth();

import moment from "moment";
import {sendRPCRequest} from "../../../../libs/common/rabbitMq.js";
import {CLIENT_PATTERN} from "../../../../libs/patterns/client/client.pattern.js";
import {PROPERTY_PATTERN} from "../../../../libs/patterns/property/property.pattern.js";
import StaffSalaryHistory from "../models/staffSalaryHistory.model.js";

//     // 1. Fetch all active staff and managers
//     const [staffResponse, managerResponse] = await Promise.all([
//       sendRPCRequest(PROPERTY_PATTERN.STAFF.GET_ALL_STAFF, {}),
//       sendRPCRequest(CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS, {}),
//     ]);

//     const activeStaff = staffResponse.success ? staffResponse.data : [];
//     const activeManagers = managerResponse.success ? managerResponse.data : [];

//     const employees = [
//       ...activeStaff
//         .filter((s) => s.status === "Active")
//         .map((s) => ({ ...s, employeeType: "Staff" })),
//       ...activeManagers
//         .filter((m) => m.status === "Active")
//         .map((m) => ({ ...m, employeeType: "Manager" })),
//     ];

//     if (employees.length === 0) {
//       console.log(
//         "CRON JOB: No active employees found. No salaries to generate."
//       );
//       return { success: true, message: "No active employees found." };
//     }

//     let createdCount = 0;
//     for (const employee of employees) {
//       // 2. Check if a salary record for this month already exists to prevent duplicates
//       const existingRecord = await StaffSalaryHistory.findOne({
//         employeeId: employee._id,
//         date: {
//           $gte: previousMonthStart,
//           $lte: previousMonthEnd,
//         },
//       });

//       if (existingRecord) {
//         continue; // Skip if already generated
//       }

//       // 3. Fetch attendance for the employee for the previous month
//       const attendanceResponse = await sendRPCRequest(
//         PROPERTY_PATTERN.ATTENDANCE.GET_ATTENDANCE,
//         {
//           employeeId: employee._id,
//           startDate: previousMonth
//             .clone()
//             .startOf("month")
//             .format("YYYY-MM-DD"),
//           endDate: previousMonth.clone().endOf("month").format("YYYY-MM-DD"),
//         }
//       );

//       const attendanceRecords = attendanceResponse.success
//         ? attendanceResponse.data.data
//         : [];

//       // 4. Calculate payable days
//       const payableDays = attendanceRecords.reduce((count, record) => {
//         if (record.status === "Present" || record.status === "Paid Leave") {
//           return count + 1;
//         }
//         return count;
//       }, 0);

//       // 5. Calculate the pro-rata salary
//       const perDaySalary = employee.salary / daysInPreviousMonth;
//       const calculatedSalary = perDaySalary * payableDays;

//       // 6. Create the new salary history record
//       await StaffSalaryHistory.create({
//         employeeId: employee._id,
//         employeeType: employee.employeeType,
//         salary: calculatedSalary, // Use the calculated salary
//         date: moment().startOf("month").toDate(), // Record is for the 1st of the current month
//         salaryPending: calculatedSalary,
//         status: "pending",
//         remarkType: `AUTOMATIC_GENERATION (${payableDays}/${daysInPreviousMonth} days)`,
//       });
//       createdCount++;
//     }

//     const logMessage = `CRON JOB: Successfully generated ${createdCount} new salary records for ${previousMonth.format(
//       "MMMM YYYY"
//     )}.`;
//     console.log(logMessage);
//     return { success: true, message: logMessage, data: { createdCount } };
//   } catch (error) {
//     console.error("CRON JOB: Error generating monthly salaries:", error);
//     return {
//       success: false,
//       message: "Error during automated salary generation.",
//       error: error.message,
//     };
//   }
// };
export const generateMonthlySalaries = async () => {
  try {
    const previousMonth = moment().subtract(1, "months");
    const previousMonthStart = previousMonth.clone().startOf("month").toDate();
    const previousMonthEnd = previousMonth.clone().endOf("month").toDate();
    const daysInPreviousMonth = previousMonth.daysInMonth();

    const [staffResponse, managerResponse] = await Promise.all([
      sendRPCRequest(PROPERTY_PATTERN.STAFF.GET_ALL_STAFF, {}),
      sendRPCRequest(CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS, {}),
    ]);

    const activeStaff = staffResponse.success
      ? staffResponse.data.filter((s) => s.status === "Active")
      : [];
    const activeManagers = managerResponse.success
      ? managerResponse.data.filter((m) => m.status === "Active")
      : [];

    const employees = [
      ...activeStaff.map((s) => ({...s, employeeType: "Staff"})),
      ...activeManagers.map((m) => ({...m, employeeType: "Manager"})),
    ];

    if (employees.length === 0) {
      console.log(
        "CRON JOB: No active employees found. No salaries to generate.",
      );
      return {success: true, message: "No active employees found."};
    }

    let createdCount = 0;
    for (const employee of employees) {
      const existingRecord = await StaffSalaryHistory.findOne({
        employeeId: employee._id,
        date: {$gte: previousMonthStart, $lte: previousMonthEnd},
      });

      if (existingRecord) continue;

      const attendanceResponse = await sendRPCRequest(
        PROPERTY_PATTERN.ATTENDANCE.GET_ATTENDANCE,
        {
          employeeId: employee._id,
          startDate: previousMonth
            .clone()
            .startOf("month")
            .format("YYYY-MM-DD"),
          endDate: previousMonth.clone().endOf("month").format("YYYY-MM-DD"),
        },
      );

      const attendanceRecords = attendanceResponse.success
        ? attendanceResponse.data.data
        : [];

      const payableDays = attendanceRecords.reduce((count, record) => {
        if (["Present", "Paid Leave"].includes(record.status)) {
          return count + 1;
        } else if (record.status === "Half Day") {
          return count + 0.5; // Add half a day for "Half Day"
        }
        return count; // "Absent" or other statuses count as 0
      }, 0);

      const perDaySalary = employee.salary / daysInPreviousMonth;
      const calculatedSalary = perDaySalary * payableDays;

      const initialAdvance = employee.advanceSalary || 0;

      // Determine how much of the advance can be applied to this month's salary.
      // You can't deduct more than the salary that was earned.
      const advanceToDeduct = Math.min(initialAdvance, calculatedSalary);

      // Calculate the employee's new remaining advance balance for the next month.
      const remainingAdvanceForNextMonth = initialAdvance - advanceToDeduct;

      // The final salary to be paid is the earned salary minus the advance that was deducted.
      const finalSalary = calculatedSalary - advanceToDeduct;

      await StaffSalaryHistory.create({
        employeeId: employee._id,
        employeeName: employee.name,
        employeeType: employee.employeeType,
        propertyId: employee.propertyId[0],
        salary: calculatedSalary, // The gross salary earned this month.
        date: moment().startOf("month").toDate(),
        salaryPending: finalSalary, // The net amount to be paid after deductions.
        advanceSalary: advanceToDeduct, // The portion of advance USED for this salary transaction.
        status: "pending",
        remarkType: `AUTOMATIC_GENERATION`,
      });

      // Update the employee's main record with the new remaining advance balance.
      if (employee.employeeType === "Staff") {
        await sendRPCRequest(PROPERTY_PATTERN.STAFF.UPDATE_STAFF, {
          staffId: employee._id,
          updateData: {advanceSalary: remainingAdvanceForNextMonth},
        });
      } else if (employee.employeeType === "Manager") {
        await sendRPCRequest(CLIENT_PATTERN.MANAGER.EDIT_MANAGER, {
          id: employee._id,
          updates: {advanceSalary: remainingAdvanceForNextMonth},
        });
      }
      createdCount++;
    }

    const logMessage = `CRON JOB: Successfully generated ${createdCount} new salary records for ${previousMonth.format(
      "MMMM YYYY",
    )}.`;
    console.log(logMessage);
    return {success: true, message: logMessage, data: {createdCount}};
  } catch (error) {
    console.error("CRON JOB: Error generating monthly salaries:", error);
    return {
      success: false,
      message: "Error during automated salary generation.",
      error: error.message,
    };
  }
};

export const generateMonthlyPayroll = async () => {
  try {
    const now = new Date();

    let month = now.getMonth() - 1;
    let year = now.getFullYear();

    if (month < 0) {
      month = 11;
      year -= 1;
    }

    const endOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = 30;

    console.log(`Generating payroll for ${month + 1}/${year}`);

    // fetch managers and staff
    const managers = await sendRPCRequest(
      CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS,
      {},
    );

    const staffs = await sendRPCRequest(
      PROPERTY_PATTERN.STAFF.GET_ALL_STAFF,
      {},
    );

    const employees = [
      ...(managers?.data || []).map((e) => ({
        ...e,
        employeeType: "Manager",
      })),
      ...(staffs?.data?.staff || []).map((e) => ({
        ...e,
        employeeType: "Staff",
      })),
    ];

    for (const emp of employees) {
      if (emp.status !== "Active") continue;
      if (new Date(emp.joinDate) > endOfMonth) continue;

      const exists = await Payroll.findOne({
        employeeId: emp._id,
        employeeType: emp.employeeType,
        month,
        year,
      });

      if (exists) continue;

      /* -------------------------
         1️⃣ Calculate base salary
      -------------------------- */
      let payableDays = daysInMonth;

      const perDaySalary = emp.salary / daysInMonth;
      const baseSalary = Math.round(perDaySalary * payableDays);

      /* -------------------------
         2️⃣ Fetch advances for THIS MONTH only
      -------------------------- */
      const advanceResult = await StaffSalaryHistory.aggregate([
        {
          $match: {
            employeeId: new mongoose.Types.ObjectId(emp._id),
            month,
            year,
            isAdvance: true,
          },
        },
        {
          $group: {
            _id: null,
            totalAdvance: {$sum: "$paidAmount"},
          },
        },
      ]);

      const advanceAdjusted = advanceResult[0]?.totalAdvance || 0;

      /* -------------------------
         3️⃣ Net Salary
      -------------------------- */
      const netSalary = Math.max(baseSalary - advanceAdjusted, 0);

      /* -------------------------
         4️⃣ Create payroll with advance adjustment details
      -------------------------- */
      await Payroll.create({
        name: emp.name,
        jobTitle: emp.jobTitle,
        employeeId: emp._id,
        employeeType: emp.employeeType,
        month,
        year,
        salary: emp.salary,
        leaveDays: 0,
        leaveDeduction: 0,
        advanceAdjusted,
        netSalary,
        paidAmount: 0,
        pendingAmount: netSalary,
        status: "Pending",

        propertyId: emp.propertyId,
        kitchenId: emp.kitchenId,
        clientId: emp.clientId,
      });
    }

    console.log("Payroll generation completed");

    return {
      success: true,
      message: "Payroll generated successfully",
    };
  } catch (error) {
    console.error("Payroll generation error:", error);
    return {
      success: false,
      message: "Payroll generation failed",
      error: error.message,
    };
  }
};
