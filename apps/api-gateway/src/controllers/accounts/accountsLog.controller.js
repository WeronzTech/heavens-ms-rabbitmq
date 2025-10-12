import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

export const getAccountLogs = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.LOG.GET_ACCOUNT_LOGS,
      req.query
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in getAccountLogs:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};
