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
