import StaffSalaryHistory from "../models/staffSalaryHistory.model.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import moment from "moment";

export const generateMonthlySalaries = async () => {
  try {
    const today = moment();
    const currentMonthStart = today.clone().startOf("month").toDate();
    const currentMonthEnd = today.clone().endOf("month").toDate();

    // Fetch active staff and managers from their respective services
    const [staffResponse, managerResponse] = await Promise.all([
      sendRPCRequest(PROPERTY_PATTERN.STAFF.GET_ALL_STAFF, {}),
      sendRPCRequest(CLIENT_PATTERN.MANAGER.GET_ALL_MANAGERS, {}),
    ]);

    const activeStaff = staffResponse.success ? staffResponse.data : [];
    const activeManagers = managerResponse.success ? managerResponse.data : [];

    const employees = [
      ...activeStaff
        .filter((s) => s.status === "Active")
        .map((s) => ({ ...s, employeeType: "Staff" })),
      ...activeManagers
        .filter((m) => m.status === "Active")
        .map((m) => ({ ...m, employeeType: "Manager" })),
    ];

    if (employees.length === 0) {
      console.log(
        "CRON JOB: No active staff or managers found. No salaries to generate."
      );
      return { success: true, message: "No active employees found." };
    }

    let createdCount = 0;
    for (const employee of employees) {
      const existingRecord = await StaffSalaryHistory.findOne({
        employeeId: employee._id,
        date: {
          $gte: currentMonthStart,
          $lte: currentMonthEnd,
        },
      });

      if (!existingRecord) {
        await StaffSalaryHistory.create({
          employeeId: employee._id,
          employeeType: employee.employeeType,
          salary: employee.salary,
          date: today.toDate(),
          salaryPending: employee.salary,
          status: "pending",
          remarkType: "AUTOMATIC_GENERATION",
        });
        createdCount++;
      }
    }

    const logMessage = `CRON JOB: Successfully generated ${createdCount} new salary records for ${today.format(
      "MMMM YYYY"
    )}.`;
    console.log(logMessage);
    return { success: true, message: logMessage, data: { createdCount } };
  } catch (error) {
    console.error("CRON JOB: Error generating monthly salaries:", error);
    return {
      success: false,
      message: "Error during automated salary generation.",
      error: error.message,
    };
  }
};
