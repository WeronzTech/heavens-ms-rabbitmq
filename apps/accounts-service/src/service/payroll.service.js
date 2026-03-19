import mongoose from "mongoose";
import {sendRPCRequest} from "../../../../libs/common/rabbitMq.js";
import {CLIENT_PATTERN} from "../../../../libs/patterns/client/client.pattern.js";
import {PROPERTY_PATTERN} from "../../../../libs/patterns/property/property.pattern.js";
import Payroll from "../models/payroll.model.js";
import {createJournalEntry} from "./accounting.service.js";
import StaffSalaryHistory from "../models/staffSalaryHistory.model.js";
import {ACCOUNT_SYSTEM_NAMES} from "../config/accountMapping.config.js";

export const processSalaryPayment = async (data) => {
  const {
    payrollId,
    amount,
    paymentMethod,
    transactionId,
    paymentDate,
    remarks = "",
    createdBy = null,
    managerId,
    pettyCashType,
  } = data;
  // console.log(data);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payroll = await Payroll.findById(payrollId).session(session);
    if (!payroll) {
      throw new Error("Payroll record not found");
    }

    /* ------------------------------
       Payroll state validation
    ------------------------------ */

    if (payroll.status === "Paid") {
      throw new Error("Salary already fully paid");
    }

    if (amount <= 0) {
      throw new Error("Invalid payment amount");
    }

    if (amount > payroll.netSalary) {
      throw new Error("Payment exceeds net salary");
    }

    /* ------------------------------
       Check duplicate transactionId
    ------------------------------ */

    if (transactionId) {
      const existingTransaction = await StaffSalaryHistory.findOne({
        transactionId,
      }).session(session);

      if (existingTransaction) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Transaction ID already exists!",
        };
      }
    }

    /* ------------------------------
       Update payroll payment info
    ------------------------------ */

    const paymentAmount = Number(amount);

    payroll.paidAmount = (payroll.paidAmount || 0) + paymentAmount;
    payroll.pendingAmount = payroll.netSalary - payroll.paidAmount;

    // ✅ Additional validation for petty cash type
    if (paymentMethod === "Petty Cash" && !pettyCashType) {
      return {
        success: false,
        status: 400,
        message: "Petty cash type (inHand/inAccount) is required",
      };
    }

    // ✅ Handle Petty Cash validation & deduction
    if (paymentMethod === "Petty Cash") {
      const pettyCashResponse = await sendRPCRequest(
        CLIENT_PATTERN.PETTYCASH.GET_PETTYCASH_BY_MANAGER,
        {managerId},
      );
      console.log(pettyCashResponse);
      if (!pettyCashResponse?.success || !pettyCashResponse.data) {
        return {
          success: false,
          status: 400,
          message: "No petty cash found for this manager",
        };
      }

      const pettyCash = pettyCashResponse.data;

      if (pettyCashType === "inHand" && pettyCash.inHandAmount < amount) {
        return {
          success: false,
          status: 400,
          message:
            "In-hand petty cash balance too low to process this transaction",
        };
      }

      if (pettyCashType === "inAccount" && pettyCash.inAccountAmount < amount) {
        return {
          success: false,
          status: 400,
          message:
            "In-account petty cash balance too low to process this transaction",
        };
      }
    }

    await StaffSalaryHistory.create(
      [
        {
          employeeId: payroll.employeeId,
          employeeName: payroll.name,
          employeeType: payroll.employeeType,

          month: payroll.month,
          year: payroll.year,

          salary: payroll.salary,
          paymentDate,
          salaryPending: payroll.pendingAmount,
          paidAmount: amount,

          status: payroll.status,

          paidBy: createdBy,
          paymentMethod,
          pettyCashType,
          handledBy: managerId,
          transactionId,

          remarks,

          propertyId: payroll.propertyId,
          kitchenId: payroll.kitchenId,
          clientId: payroll.clientId,
        },
      ],
      {session},
    );

    /* ------------------------------
       Update payroll status
    ------------------------------ */

    if (payroll.pendingAmount === 0) {
      payroll.status = "Paid";
    } else {
      payroll.status = "Pending";
    }

    await payroll.save({session});

    /* ------------------------------
       Accounting Journal Entry
    ------------------------------ */

    // const paymentAccount =
    //   paymentMethod === "Cash"
    //     ? ACCOUNT_SYSTEM_NAMES.ASSET_CORE_CASH
    //     : ACCOUNT_SYSTEM_NAMES.ASSET_CORE_BANK;

    // await createJournalEntry(
    //   {
    //     date: new Date(),

    //     description: `Salary payment for ${payroll.month}/${payroll.year}`,

    //     entityType: "CLIENT",
    //     entityId: payroll.clientId,

    //     transactions: [
    //       {
    //         systemName: ACCOUNT_SYSTEM_NAMES.EXPENSE_SALARIES,
    //         debit: amount,
    //       },
    //       {
    //         systemName: paymentAccount,
    //         credit: amount,
    //       },
    //     ],

    //     referenceType: "Salary Payment",
    //     referenceId: payroll._id,
    //     clientId: payroll.clientId,
    //   },
    //   {session},
    // );

    if (paymentMethod === "Petty Cash" && pettyCashType === "inHand") {
      await sendRPCRequest(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, {
        manager: managerId,
        managerName: payroll.name,
        pettyCashType,
        inHandAmount: -paymentAmount,
      });
    }

    if (paymentMethod === "Petty Cash" && pettyCashType === "inAccount") {
      await sendRPCRequest(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, {
        manager: managerId,
        managerName: payroll.name,
        pettyCashType,
        inAccountAmount: -paymentAmount,
      });
    }

    await session.commitTransaction();

    return {
      success: true,
      message: "Salary payment recorded successfully",
      data: payroll,
    };
  } catch (error) {
    await session.abortTransaction();

    return {
      success: false,
      message: error.message,
    };
  } finally {
    session.endSession();
  }
};

export const createSalaryAdvance = async (data) => {
  const {
    employeeId,
    employeeType,
    employeeName,

    amount,
    paymentMethod,
    transactionId,

    managerId,
    pettyCashType,
    managerName,

    remarks,
    targetMonth,
    targetYear,
    paymentDate,
    salary,
    createdBy,
    propertyId,
    kitchenId,
    clientId,
  } = data;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (targetYear < currentYear) {
    throw new Error("Advance can only be created for current or future months");
  }

  if (targetYear === currentYear && targetMonth < currentMonth) {
    throw new Error("Advance can only be created for current or future months");
  }

  const maxFutureMonths = 6;

  const monthsDiff =
    (targetYear - currentYear) * 12 + (targetMonth - currentMonth);

  if (monthsDiff > maxFutureMonths) {
    throw new Error(
      `Advance can only be created for up to ${maxFutureMonths} months in the future`,
    );
  }

  /* ------------------------------
   Check duplicate transactionId
------------------------------ */

  if (transactionId) {
    const existingTransaction = await StaffSalaryHistory.findOne({
      transactionId,
    });

    if (existingTransaction) {
      return {
        success: false,
        message: "Transaction ID already exists!",
      };
    }
  }

  /* ------------------------------
     Get existing advances
  ------------------------------ */

  const existingAdvances = await StaffSalaryHistory.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        month: targetMonth,
        year: targetYear,
        isAdvance: true,
      },
    },
    {
      $group: {
        _id: null,
        paidAmount: {$sum: "$paidAmount"},
      },
    },
  ]);

  const totalAdvanceTaken = existingAdvances[0]?.paidAmount || 0;

  /* ------------------------------
     Calculate remaining salary
  ------------------------------ */

  const newTotalAdvance = totalAdvanceTaken + amount;

  if (newTotalAdvance > salary) {
    throw new Error(
      `Advance exceeds salary. Remaining allowed advance: ${
        salary - totalAdvanceTaken
      }`,
    );
  }

  const salaryPending = salary - newTotalAdvance;

  // ✅ Additional validation for petty cash type
  if (paymentMethod === "Petty Cash" && !pettyCashType) {
    return {
      success: false,
      status: 400,
      message: "Petty cash type (inHand/inAccount) is required",
    };
  }

  // ✅ Handle Petty Cash validation & deduction
  if (paymentMethod === "Petty Cash") {
    const pettyCashResponse = await sendRPCRequest(
      CLIENT_PATTERN.PETTYCASH.GET_PETTYCASH_BY_MANAGER,
      {managerId},
    );
    if (!pettyCashResponse?.success || !pettyCashResponse.data) {
      return {
        success: false,
        status: 400,
        message: "No petty cash found for this manager",
      };
    }

    const pettyCash = pettyCashResponse.data;

    if (pettyCashType === "inHand" && pettyCash.inHandAmount < amount) {
      return {
        success: false,
        status: 400,
        message:
          "In-hand petty cash balance too low to process this transaction",
      };
    }

    if (pettyCashType === "inAccount" && pettyCash.inAccountAmount < amount) {
      return {
        success: false,
        status: 400,
        message:
          "In-account petty cash balance too low to process this transaction",
      };
    }
  }

  /* ------------------------------
     Create advance record
  ------------------------------ */

  const advance = await StaffSalaryHistory.create({
    employeeId,
    employeeName,
    employeeType,

    month: targetMonth,
    year: targetYear,

    salary,
    salaryPending,

    paidAmount: amount,
    paymentDate,

    paymentMethod,
    pettyCashType,
    transactionId,

    propertyId,
    kitchenId,
    clientId,

    remarks,
    createdBy,
    handledBy: managerId,

    isAdvance: true,
  });

  if (paymentMethod === "Petty Cash" && pettyCashType === "inHand") {
    await sendRPCRequest(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, {
      manager: managerId,
      managerName,
      pettyCashType,
      inHandAmount: -amount,
    });
  }

  if (paymentMethod === "Petty Cash" && pettyCashType === "inAccount") {
    await sendRPCRequest(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, {
      manager: managerId,
      managerName,
      pettyCashType,
      inAccountAmount: -amount,
    });
  }

  return {
    success: true,
    message: "Salary advance created successfully",
    data: advance,
  };
};

export const updatePayrollLeave = async ({
  payrollId,
  leaveDays,
  daysInMonth = 30,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payroll = await Payroll.findById(payrollId).session(session);

    if (!payroll) {
      throw new Error("Payroll record not found");
    }

    /* ------------------------------
       Prevent editing after payment
    ------------------------------ */

    if (payroll.status === "Paid") {
      throw new Error("Cannot update leave after salary is paid or locked");
    }

    const currentLeaveDays = payroll.leaveDays || 0;
    const newLeaveDays = Number(leaveDays);

    if (isNaN(newLeaveDays)) {
      throw new Error("Invalid leave days value");
    }

    if (newLeaveDays < 0) {
      throw new Error("Leave days cannot be negative");
    }

    if (newLeaveDays > daysInMonth) {
      throw new Error(
        `Total leave days (${newLeaveDays}) cannot exceed ${daysInMonth}`,
      );
    }

    /* ------------------------------
       Calculate leave deduction
    ------------------------------ */

    const perDaySalary = payroll.salary / daysInMonth;

    const leaveDeduction = Math.round(perDaySalary * newLeaveDays);

    /* ------------------------------
       Recalculate net salary
       (ALWAYS use base salary)
    ------------------------------ */

    const newNetSalary =
      payroll.salary - payroll.advanceAdjusted - leaveDeduction;

    if (newNetSalary < 0) {
      throw new Error("Leave deduction cannot reduce salary below zero");
    }

    if (newNetSalary < payroll.paidAmount) {
      throw new Error(
        `Salary already paid (${payroll.paidAmount}) exceeds recalculated salary (${newNetSalary})`,
      );
    }

    /* ------------------------------
       Update payroll fields
    ------------------------------ */

    payroll.leaveDays = newLeaveDays;
    payroll.leaveDeduction = leaveDeduction;
    payroll.netSalary = newNetSalary;

    payroll.pendingAmount = newNetSalary - payroll.paidAmount;

    /* ------------------------------
       Update payroll status
    ------------------------------ */

    payroll.status = payroll.pendingAmount === 0 ? "Paid" : "Pending";

    await payroll.save({session});

    await session.commitTransaction();

    return {
      success: true,
      message: `Leave updated successfully. ${currentLeaveDays} → ${newLeaveDays} days`,
      data: {
        ...payroll.toObject(),
        previousLeaveDays: currentLeaveDays,
        newLeaveDays,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Leave update error:", error);
    throw error;
  } finally {
    session.endSession();
  }
};

export const generateMissingPayrollBulk = async () => {
  try {
    const today = new Date();

    let endMonth = today.getMonth() - 1;
    let endYear = today.getFullYear();

    if (endMonth < 0) {
      endMonth = 11;
      endYear -= 1;
    }

    console.log(`Generating missing payrolls till ${endMonth + 1}/${endYear}`);

    /* -------------------------
       Fetch Employees once
    -------------------------- */

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
    ].filter((e) => e.status === "Active");

    const employeeIds = employees.map((e) => e._id);

    /* -------------------------
       Fetch existing payrolls
    -------------------------- */

    const existingPayrolls = await Payroll.find({
      employeeId: {$in: employeeIds},
    });

    const payrollSet = new Set(
      existingPayrolls.map((p) => `${p.employeeId}_${p.month}_${p.year}`),
    );

    /* -------------------------
       Prepare bulk operations
    -------------------------- */

    const bulkOps = [];

    for (const emp of employees) {
      const joinDate = new Date(emp.joinDate);

      let currentMonth = joinDate.getMonth();
      let currentYear = joinDate.getFullYear();

      while (
        currentYear < endYear ||
        (currentYear === endYear && currentMonth <= endMonth)
      ) {
        const key = `${emp._id}_${currentMonth}_${currentYear}`;

        if (payrollSet.has(key)) {
          currentMonth++;

          if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
          }

          continue;
        }

        const baseSalary = emp.salary;

        bulkOps.push({
          insertOne: {
            document: {
              name: emp.name,
              jobTitle: emp.jobTitle,
              employeeId: emp._id,
              employeeType: emp.employeeType,

              month: currentMonth,
              year: currentYear,

              salary: baseSalary,

              leaveDays: 0,
              leaveDeduction: 0,

              advanceAdjusted: 0,

              netSalary: baseSalary,

              paidAmount: 0,
              pendingAmount: baseSalary,

              status: "Pending",

              propertyId: emp.propertyId,
              kitchenId: emp.kitchenId,
              clientId: emp.clientId,
            },
          },
        });

        currentMonth++;

        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }
    }

    /* -------------------------
       Bulk insert
    -------------------------- */

    if (bulkOps.length > 0) {
      await Payroll.bulkWrite(bulkOps);
    }

    console.log(`${bulkOps.length} payrolls created`);

    return {
      success: true,
      message: "Missing payroll generated",
      created: bulkOps.length,
    };
  } catch (error) {
    console.error("Payroll generation error:", error);

    return {
      success: false,
      message: error.message,
    };
  }
};

export const getPayrolls = async (data) => {
  try {
    const {search, month, year, status, propertyId, kitchenId, clientId, type} =
      data;

    console.log("Received data:", data);

    const filter = {};

    /* -------------------------
       Search by employee name
    -------------------------- */
    if (search) {
      filter.name = {$regex: search, $options: "i"};
    }

    /* -------------------------
       Month filter
    -------------------------- */
    if (month !== undefined && month !== null && month !== "") {
      filter.month = Number(month);
    }

    /* -------------------------
       Year filter
    -------------------------- */
    if (year !== undefined && year !== null && year !== "") {
      filter.year = Number(year);
    }

    /* -------------------------
       Status filter
    -------------------------- */
    if (
      status &&
      status !== "all" &&
      status !== "undefined" &&
      status !== "null"
    ) {
      filter.status = status;
    }

    /* -------------------------
       Client filter (always apply if provided)
    -------------------------- */
    if (clientId && clientId !== "undefined" && clientId !== "null") {
      filter.clientId = clientId;
    }

    /* -------------------------
       Handle property/kitchen filtering based on type and provided IDs
    -------------------------- */

    // CASE 1: Specific propertyId provided
    if (
      propertyId &&
      propertyId !== "all" &&
      propertyId !== "undefined" &&
      propertyId !== "null"
    ) {
      // Check if propertyId exists in the propertyId array
      filter.propertyId = {$in: [propertyId]};
    }
    // CASE 2: Specific kitchenId provided
    else if (
      kitchenId &&
      kitchenId !== "all" &&
      kitchenId !== "undefined" &&
      kitchenId !== "null"
    ) {
      // Check if kitchenId exists in the kitchenId array
      filter.kitchenId = {$in: [kitchenId]};
    }
    // CASE 3: No specific ID provided, but type is specified
    else if (type) {
      if (type === "PROPERTY") {
        // For PROPERTY type with no specific propertyId, get all records that have at least one propertyId
        filter.propertyId = {$exists: true, $ne: []};
      } else if (type === "KITCHEN") {
        // For KITCHEN type with no specific kitchenId, get all records that have at least one kitchenId
        filter.kitchenId = {$exists: true, $ne: []};
      }
    }

    // console.log("MongoDB filter:", JSON.stringify(filter, null, 2));

    /* -------------------------
       Fetch payrolls
    -------------------------- */
    const payrolls = await Payroll.find(filter).lean();

    return {
      success: true,
      message: "Payrolls fetched successfully",
      data: payrolls,
      total: payrolls.length,
    };
  } catch (error) {
    console.error("Get payrolls error:", error);

    return {
      success: false,
      message: error.message,
    };
  }
};

export const getEmployeeTransactionHistory = async (filters = {}) => {
  try {
    const {employeeId, month, year, paymentMethod} = filters;

    // Build the query
    const query = {};

    // Filter by employee
    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return {
          success: false,
          message: "Invalid employee ID format",
          statusCode: 400,
        };
      }
      query.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    // Filter by month and year
    if (month !== undefined && month !== null) {
      query.month = Number(month);
    }

    if (year !== undefined && year !== null) {
      query.year = Number(year);
    }

    // Filter by payment method
    if (paymentMethod && paymentMethod !== "all") {
      query.paymentMethod = paymentMethod;
    }

    console.log("Transaction history query:", JSON.stringify(query, null, 2));

    // Execute queries
    const [transactions] = await Promise.all([
      StaffSalaryHistory.find(query).lean(),
    ]);

    return {
      success: true,
      message: "Transaction history fetched successfully",
      data: {
        transactions,
      },
      statusCode: 200,
    };
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch transaction history",
      statusCode: 500,
    };
  }
};

export const getEmployeeAdvanceForMonth = async (data) => {
  const {employeeId} = data;

  const month = Number(data.month);
  const year = Number(data.year);
  console.log(month, year);
  const transactions = await StaffSalaryHistory.find({
    employeeId: new mongoose.Types.ObjectId(employeeId),
    month: month,
    year: year,
    isAdvance: true,
  }).sort({paymentDate: -1});

  const totalAdvance = transactions.reduce(
    (sum, t) => sum + (t.paidAmount || 0),
    0,
  );

  return {
    success: true,
    data: {
      totalAdvance,
      totalTransactions: transactions.length,
      transactions,
    },
  };
};

// export const editPayrollSalary = async (data) => {
//   try {
//     const {payrollId, salary} = data;
//     const payroll = await Payroll.findById(payrollId);

//     if (!payroll) {
//       return {
//         success: false,
//         status: 404,
//         message: "Payroll record not found",
//       };
//     }

//     const newSalary = Number(salary);

//     if (newSalary <= 0) {
//       return {
//         success: false,
//         status: 400,
//         message: "Salary must be greater than 0",
//       };
//     }

//     const paidAmount = payroll.paidAmount || 0;

//     /* --------------------------------
//        Prevent salary below paid amount
//     -------------------------------- */

//     if (newSalary < paidAmount) {
//       return {
//         success: false,
//         status: 400,
//         message: "Cannot reduce salary below the already paid amount",
//       };
//     }

//     /* --------------------------------
//        Update salary & netSalary
//     -------------------------------- */

//     payroll.salary = newSalary;
//     payroll.netSalary = newSalary;

//     /* --------------------------------
//        Recalculate pending amount
//     -------------------------------- */

//     const pendingAmount = newSalary - paidAmount;

//     payroll.pendingAmount = pendingAmount < 0 ? 0 : pendingAmount;

//     /* --------------------------------
//        Update status
//     -------------------------------- */

//     payroll.status = payroll.pendingAmount === 0 ? "Paid" : "Pending";

//     await payroll.save();

//     return {
//       success: true,
//       message: "Payroll salary updated successfully",
//       data: payroll,
//     };
//   } catch (error) {
//     console.error("Edit payroll error:", error);

//     return {
//       success: false,
//       status: 500,
//       message: "Internal server error",
//     };
//   }
// };
export const editPayrollSalary = async (data) => {
  try {
    const {payrollId, salary} = data;
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return {success: false, status: 404, message: "Payroll record not found"};
    }
    const newSalary = Number(salary);
    if (newSalary <= 0) {
      return {
        success: false,
        status: 400,
        message: "Salary must be greater than 0",
      };
    }
    const paidAmount = payroll.paidAmount || 0;
    const leaveDeduction = payroll.leaveDeduction || 0;
    /* --- Calculate new net salary ---*/ const newNetSalary =
      newSalary - leaveDeduction;
    if (newNetSalary < 0) {
      return {
        success: false,
        status: 400,
        message: "Net salary cannot be negative",
      };
    }
    /* ----- Prevent invalid reduction -----------*/
    if (newNetSalary < paidAmount) {
      return {
        success: false,
        status: 400,
        message:
          "Cannot reduce salary because paid amount exceeds new net salary",
      };
    }
    /* ------- Update salary values ----------*/
    payroll.salary = newSalary;
    payroll.netSalary = newNetSalary;
    /* ---------- Recalculate pending ------*/
    payroll.pendingAmount = newNetSalary - paidAmount;
    /* ---------- Update status ------------*/
    payroll.status = payroll.pendingAmount === 0 ? "Paid" : "Pending";
    await payroll.save();
    return {
      success: true,
      message: "Payroll salary updated successfully",
      data: payroll,
    };
  } catch (error) {
    console.error("Edit payroll error:", error);
    return {success: false, status: 500, message: "Internal server error"};
  }
};
