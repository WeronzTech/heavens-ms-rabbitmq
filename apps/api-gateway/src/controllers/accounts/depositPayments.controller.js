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

export const initiateOnlineDepositPayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.INITIATE_ONLINE_DEPOSIT,
    req.body
  );
};

export const verifyAndRecordOnlineDepositPayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.VERIFY_ONLINE_DEPOSIT,
    req.body
  );
};

export const recordManualDepositPayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.RECORD_MANUAL_DEPOSIT,
    req.body
  );
};

export const getAllDepositPayments = async (req, res) => {
  try {
    const {
      propertyId,
      isRefund,
      page = 1,
      limit = 10,
      userType,
      paymentMethod,
      paymentMonth,
      paymentYear,
      search,
    } = req.query;
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.GET_ALL_DEPOSIT_PAYMENTS,
      {
        propertyId,
        isRefund,
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
    console.error("RPC Get All Deposit Payments Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const processAndRecordRefundPayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.RECORD_REFUND_PAYMENT,
    req.body
  );
};
