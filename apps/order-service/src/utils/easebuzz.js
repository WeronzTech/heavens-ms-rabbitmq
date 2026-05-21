import crypto from "crypto";
import Merchant from "../models/merchant.model.js";
import {
  initiateEasebuzzPayment,
  verifyEasebuzzPayment,
} from "../../../../libs/common/easebuzz.js";

// Helper to fetch credentials
const getEasebuzzCredentials = async (merchantId) => {
  if (!merchantId) {
    throw new Error("Merchant ID is required to process payment.");
  }

  const merchant = await Merchant.findById(merchantId);
  if (!merchant) {
    throw new Error("Merchant not found.");
  }

  const { easebuzzKey, easebuzzSalt, easebuzzSubMerchantId } =
    merchant.bankDetail || {};

  if (!easebuzzKey || !easebuzzSalt) {
    throw new Error("Merchant has not configured Easebuzz credentials.");
  }

  return {
    key: easebuzzKey,
    salt: easebuzzSalt,
    subMerchantId: easebuzzSubMerchantId,
  };
};

const createEasebuzzOrderId = async (amount, merchantId) => {
  try {
    const { key, salt, subMerchantId } =
      await getEasebuzzCredentials(merchantId);

    const paymentResponse = await initiateEasebuzzPayment({
      amount: amount, // Amount in INR
      productinfo: "Order Payment",
      firstname: "Customer",
      email: "customer@example.com",
      phone: "9999999999",
      surl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-success`,
      furl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-failure`,
      key,
      salt,
      merchantId: subMerchantId,
    });

    if (!paymentResponse.success) {
      return { success: false, error: paymentResponse.error };
    }

    return {
      success: true,
      orderId: paymentResponse.txnid,
      access_key: paymentResponse.access_key,
      key,
    };
  } catch (err) {
    console.error("Error in processing payment:", err);
    return { success: false, error: err.message };
  }
};

const verifyOrderPaymentSignature = async (paymentDetails, merchantId) => {
  const { salt } = await getEasebuzzCredentials(merchantId);

  if (!salt) {
    throw new Error("Easebuzz salt is required for verification.");
  }

  return verifyEasebuzzPayment(paymentDetails, salt);
};

const processEasebuzzRefund = async (paymentId, amount, merchantId) => {
  console.log("Easebuzz refund requested for paymentId:", paymentId);
  return { success: true, refundId: `REF_${Date.now()}` };
};

export {
  createEasebuzzOrderId,
  verifyOrderPaymentSignature,
  processEasebuzzRefund,
};
