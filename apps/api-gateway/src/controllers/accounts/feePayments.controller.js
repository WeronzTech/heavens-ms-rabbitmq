import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

export const addFeePaymentController = async (req, res) => {
  try {
    const paymentData = req.body;

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.ADD_FEE_PAYMENTS,
      paymentData // Send the data directly, not wrapped in {data: {}}
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Add FEE PAYMENT Controller Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateFeePaymentController = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const updateData = req.body;

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.UPDATE_FEE_PAYMENT,
      { paymentId, updateData }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Update Fee Payment Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getFeePaymentController = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_FEE_PAYMENT,
      { paymentId }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get Fee Payment Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

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

export const initiateOnlinePayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.FEE_PAYMENTS.INITIATE_ONLINE,
    req.body
  );
};

export const verifyAndRecordOnlinePayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.FEE_PAYMENTS.VERIFY_ONLINE,
    req.body
  );
};

export const recordManualPayment = (req, res) => {
  return handleRPCAndRespond(
    res,
    ACCOUNTS_PATTERN.FEE_PAYMENTS.RECORD_MANUAL,
    req.body
  );
};

export const getAllFeePaymentsController = async (req, res) => {
  try {
    const { propertyId, rentType, page = 1, limit = 10 } = req.query;
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_ALL_FEE_PAYMENTS,
      { propertyId, rentType, page, limit }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get All Fee Payments Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getMonthWiseRentCollectionController = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_MONTHWISE_TOTAL_COLLECTION,
      {}
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error(
      "RPC Get Month Wise Rent Collection Controller Error:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getFinancialSummary = async (req, res) => {
  try {
    const { propertyId, rentType } = req.query;
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_FINANCIAL_SUMMARY,
      { propertyId, rentType }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error(
      "RPC Get Month Wise Rent Collection Controller Error:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getNextDueDate = async (req, res) => {
  try {
    const userId = req.userAuth;
    console.log("UserId", userId);
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_NEXT_DUE_DATE,
      { userId }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get Next Due Date Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAllAccountsPaymentController = async (req, res) => {
  try {
    const { propertyId } = req.query;

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_PAYMENT_SUMMARY,
      { propertyId } // pass propertyId to RPC request
    );

    if (response.success) {
      return res.status(200).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("[ACCOUNTS] Error in getAllAccountsPaymentController:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while fetching accounts summary.",
      error: error.message,
    });
  }
};

export const getUserPaymentsController = async (req, res) => {
  try {
  
    const userId = req.userAuth;

    if (!userId) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: "Unauthorized: User ID not found in token",
      });
    }

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_PAYMENTS_BY_USERID, 
      { userId }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("[ACCOUNTS] Error in getUserPaymentsController:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while fetching user payments.",
      error: error.message,
    });
  }
};

export const getWaveOffedPaymentsController = async (req, res) => {
  try {
    // Get propertyId from query params
    const { propertyId } = req.query;

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_WAVEOFF_PAYMENTS,
      { propertyId }
    );

    return res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("RPC Get WaveOffed Payments Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};