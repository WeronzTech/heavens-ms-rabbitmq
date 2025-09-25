import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

export const addFeePaymentController = async (req, res) => {
  try {
    const paymentData = req.body;

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.ADD_FEE_PAYMENTS,
      paymentData  // Send the data directly, not wrapped in {data: {}}
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
      error: error.message 
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
      error: error.message 
    });
  };
};

export const getAllFeePaymentsController = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_ALL_FEE_PAYMENTS,
     {}
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
    console.error("RPC Get Month Wise Rent Collection Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};