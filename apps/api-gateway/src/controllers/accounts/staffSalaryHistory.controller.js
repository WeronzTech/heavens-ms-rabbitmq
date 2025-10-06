import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const manualAddSalary = (req, res) => {
  const payload = {
    ...req.body,
    paidBy: req.userAuth, // Assumes user ID is available from auth middleware
  };
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.SALARY.MANUAL_CREATE,
    payload
  );
};

export const getAllSalaryRecords = (req, res) => {
  return handleRPCAndRespond(res, ACCOUNTS_PATTERN.SALARY.GET_ALL, req.query);
};
