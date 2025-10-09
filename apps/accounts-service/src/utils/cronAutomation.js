export const generateMonthlySalaries = async () => {
  try {
    const previousMonth = moment().subtract(1, "months");
    const previousMonthStart = previousMonth.clone().startOf("month").toDate();
    const previousMonthEnd = previousMonth.clone().endOf("month").toDate();
    const daysInPreviousMonth = previousMonth.daysInMonth();

    // 1. Fetch all active staff and managers
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
        "CRON JOB: No active employees found. No salaries to generate."
      );
      return { success: true, message: "No active employees found." };
    }

    let createdCount = 0;
    for (const employee of employees) {
      // 2. Check if a salary record for this month already exists to prevent duplicates
      const existingRecord = await StaffSalaryHistory.findOne({
        employeeId: employee._id,
        date: {
          $gte: previousMonthStart,
          $lte: previousMonthEnd,
        },
      });

      if (existingRecord) {
        continue; // Skip if already generated
      }

      // 3. Fetch attendance for the employee for the previous month
      const attendanceResponse = await sendRPCRequest(
        PROPERTY_PATTERN.ATTENDANCE.GET_ATTENDANCE,
        {
          employeeId: employee._id,
          startDate: previousMonth
            .clone()
            .startOf("month")
            .format("YYYY-MM-DD"),
          endDate: previousMonth.clone().endOf("month").format("YYYY-MM-DD"),
        }
      );

      const attendanceRecords = attendanceResponse.success
        ? attendanceResponse.data.data
        : [];

      // 4. Calculate payable days
      const payableDays = attendanceRecords.reduce((count, record) => {
        if (record.status === "Present" || record.status === "Paid Leave") {
          return count + 1;
        }
        return count;
      }, 0);

      // 5. Calculate the pro-rata salary
      const perDaySalary = employee.salary / daysInPreviousMonth;
      const calculatedSalary = perDaySalary * payableDays;

      // 6. Create the new salary history record
      await StaffSalaryHistory.create({
        employeeId: employee._id,
        employeeType: employee.employeeType,
        salary: calculatedSalary, // Use the calculated salary
        date: moment().startOf("month").toDate(), // Record is for the 1st of the current month
        salaryPending: calculatedSalary,
        status: "pending",
        remarkType: `AUTOMATIC_GENERATION (${payableDays}/${daysInPreviousMonth} days)`,
      });
      createdCount++;
    }

    const logMessage = `CRON JOB: Successfully generated ${createdCount} new salary records for ${previousMonth.format(
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
