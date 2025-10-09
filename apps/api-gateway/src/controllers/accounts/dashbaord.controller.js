import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

export const getAccountDashboardDataForIncomeSection = async (req, res) => {
  try {
    const { propertyId } = req.query;

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.DASHBOARD.GET_ACCOUNT_DASHBAORD_DATA_FOR_INCOME_SECTION,
      { propertyId }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error(
      "RPC Get account dashboard data for income Controller Error:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAccountDashboardDataForExpenseSection = async (req, res) => {
  try {
    const { propertyId } = req.query;

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.DASHBOARD
        .GET_ACCOUNT_DASHBAORD_DATA_FOR_EXPENESE_SECTION,
      { propertyId }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error(
      "RPC Get account dashboard data for expense Controller Error:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}; 

export const getGSTReportController = async (req, res) => {
  try {
    // You can pass query params if needed, e.g., startDate, endDate
    const response = await sendRPCRequest(ACCOUNTS_PATTERN.DASHBOARD.GET_GST_REPORT, {});

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get GST report Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
