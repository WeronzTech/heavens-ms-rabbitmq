import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

export const getProfitAndLoss = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.REPORT.GET_PNL,
    req.query // Pass filters like ?propertyId=...&startDate=...&endDate=...
  );
};

export const getBalanceSheet = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.REPORT.GET_BALANCE_SHEET,
    req.query // Pass filters like ?propertyId=...&asOfDate=...
  );
};
