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

export const initiateOnlineBusPayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.BUS_PAYMENTS.INITIATE_ONLINE_BUS_PAYMENT,
    req.body
  );
};

export const verifyAndRecordOnlineBusPayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.BUS_PAYMENTS.VERIFY_ONLINE_BUS_PAYMENT,
    req.body
  );
};

export const recordManualBusPayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.BUS_PAYMENTS.RECORD_MANUAL_BUS_PAYMENT,
    req.body
  );
};

export const getAllBusPayments = async (req, res) => {
  try {
    const {
      propertyId,
      page = 1,
      limit = 10,
      userType,
      paymentMethod,
      paymentMonth,
      paymentYear,
      search,
    } = req.query;
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.BUS_PAYMENTS.GET_ALL_BUS_PAYMENTS,
      {
        propertyId,
        page,
        limit,
        userType,
        paymentMethod,
        paymentMonth,
        paymentYear,
        search,
      }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get All Bus Payments Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getTransactionHistoryByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: "Unauthorized: User ID not found",
      });
    }

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.BUS_PAYMENTS.GET_TRANSACTIONS_BY_USERID,
      { userId }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("[ACCOUNTS] Error in get transactions:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching user transactions.",
      error: error.message,
    });
  }
};
