import {sendRPCRequest} from "../../../../../libs/common/rabbitMq.js";
import {ACCOUNTS_PATTERN} from "../../../../../libs/patterns/accounts/accounts.pattern.js";

export const generateMissingPayroll = async (req, res) => {
  try {
    const result = await sendRPCRequest(
      ACCOUNTS_PATTERN.PAYROLL.GENERATE_MISSING_PAYROLL,
      {},
    );

    return res.status(200).json({
      success: true,
      message: "Missing payroll generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Generate missing payroll error:", error);

    return res.status(500).json({
      success: false,
      message: "Payroll generation failed",
      error: error.message,
    });
  }
};

export const processSalaryPayment = async (req, res) => {
  try {
    const result = await sendRPCRequest(ACCOUNTS_PATTERN.PAYROLL.MAKE_PAYMENT, {
      ...req.body,
    });

    // handle service failure
    if (!result?.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Salary payment failed",
      });
    }

    // success response
    return res.status(200).json({
      success: true,
      message: "Salary payment recorded successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Salary payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Salary payment failed",
      error: error.message,
    });
  }
};

export const createSalaryAdvance = async (req, res) => {
  try {
    const {
      employeeId,
      employeeType,
      employeeName,

      managerId,
      pettyCashType,
      managerName,

      amount,
      paymentMethod,
      targetMonth,
      targetYear,
      salary,
      paymentDate,
      transactionId,

      propertyId,
      kitchenId,
      clientId,
      remarks,
    } = req.body;

    // Validation
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    // Send RPC request to accounts service
    const result = await sendRPCRequest(
      ACCOUNTS_PATTERN.PAYROLL.ADVANCE_SALARY,
      {
        employeeId,
        employeeType,
        employeeName,

        managerId,
        pettyCashType,
        managerName,

        targetMonth: Number(targetMonth),
        targetYear: Number(targetYear),
        amount: Number(amount),
        paymentMethod,
        salary,
        paymentDate,
        transactionId,

        propertyId,
        kitchenId,
        clientId,
        remarks,
        createdBy: req.userName,
      },
    );

    console.log("📥 RPC Response from accounts service:", result);

    if (!result || !result.success) {
      return res.status(400).json({
        success: false,
        message: result?.message || "Failed to create salary advance",
        error: result?.error,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Salary advance created successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Salary advance creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create salary advance",
      error: error.message,
    });
  }
};

export const updatePayrollLeave = async (req, res) => {
  try {
    const {payrollId} = req.params;
    const {leaveDays} = req.body;

    const result = await sendRPCRequest(
      ACCOUNTS_PATTERN.PAYROLL.PAYROLL_LEAVE,
      {
        payrollId,
        leaveDays,
      },
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      success: true,
      message: "Leave updated successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Leave updation error:", error);

    return res.status(500).json({
      success: false,
      message: "Leave updation failed",
      error: error.message,
    });
  }
};

export const getPayrolls = async (req, res) => {
  try {
    const result = await sendRPCRequest(
      ACCOUNTS_PATTERN.PAYROLL.GET_ALL_PAYROLL,
      {...req.query, clientId: req.clientId},
    );

    return res.status(200).json({
      success: true,
      message: "payroll successfully get",
      data: result,
    });
  } catch (error) {
    console.log("payroll error:", error);

    return res.status(500).json({
      success: false,
      message: "Payroll get failed",
      error: error.message,
    });
  }
};

export const getEmployeeTransactionHistory = async (req, res) => {
  try {
    const {employeeId} = req.params;
    const result = await sendRPCRequest(
      ACCOUNTS_PATTERN.PAYROLL.GET_ALL_TRANSACTION_BY_EMPLOYEEID,
      {...req.query, employeeId, clientId: req.clientId},
    );

    return res.status(200).json({
      success: true,
      message: "transactions successfully get",
      data: result,
    });
  } catch (error) {
    console.error("transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "transactions get failed",
      error: error.message,
    });
  }
};

export const getEmployeeAdvanceForMonth = async (req, res) => {
  try {
    const {employeeId} = req.params;
    const result = await sendRPCRequest(
      ACCOUNTS_PATTERN.PAYROLL.GET_ALL_ADVANCE_TRANSACTION_BY_EMPLOYEEID,
      {...req.query, employeeId},
    );

    return res.status(200).json({
      success: true,
      message: "Advance transactions successfully get",
      data: result,
    });
  } catch (error) {
    console.error("Advance transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Advance transactions get failed",
      error: error.message,
    });
  }
};

export const editPayrollSalary = async (req, res) => {
  try {
    const {payrollId} = req.params;
    const {salary} = req.body;

    const result = await sendRPCRequest(
      ACCOUNTS_PATTERN.PAYROLL.UPDATE_PAYROLL,
      {
        payrollId,
        salary,
      },
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      success: true,
      message: "Salary updated successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Salary updation error:", error);

    return res.status(500).json({
      success: false,
      message: "Salary updation failed",
      error: error.message,
    });
  }
};
