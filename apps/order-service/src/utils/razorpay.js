import crypto from "crypto";
import Razorpay from "razorpay";
import Merchant from "../models/merchant.model.js";

// Helper to fetch credentials and instantiate Razorpay
const getRazorpayInstance = async (merchantId) => {
  if (!merchantId) {
    throw new Error("Merchant ID is required to process payment.");
  }

  const merchant = await Merchant.findById(merchantId);
  if (!merchant) {
    throw new Error("Merchant not found.");
  }

  const { razorpayKeyId, razorpayKeySecret } =
    merchant.merchantDetail?.bankDetail || {};

  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new Error("Merchant has not configured Razorpay credentials.");
  }

  const instance = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });

  return { instance, keyId: razorpayKeyId, keySecret: razorpayKeySecret };
};

const createRazorpayOrderId = async (amount, merchantId) => {
  try {
    // Fetch instance using merchantId
    const { instance, keyId } = await getRazorpayInstance(merchantId);

    const options = {
      amount: Math.round(amount * 100), // Ensure integer (paise)
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };

    const order = await instance.orders.create(options);
    console.log("Razorpay Order Created:", order.id);

    // Return keyId as well so frontend knows which key to use
    return { success: true, orderId: order.id, keyId };
  } catch (err) {
    console.error("Error in processing payment:", err);
    return { success: false, error: err.message };
  }
};

const verifyPayment = async (paymentDetails, merchantId) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    paymentDetails;

  // Fetch credentials using merchantId to get the secret
  const { keySecret } = await getRazorpayInstance(merchantId);

  if (!keySecret) {
    throw new Error("Razorpay key secret is required for verification.");
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === razorpay_signature;
};

const razorpayRefund = async (paymentId, amount, merchantId) => {
  try {
    const { instance } = await getRazorpayInstance(merchantId);

    // Amount for refund must be in paise
    const refund = await instance.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      speed: "normal",
    });

    return { success: true, refundId: refund.id };
  } catch (err) {
    console.error("Error in processing refund:", err);
    return { success: false, error: err.message };
  }
};

const createRazorpayQrCode = async (amount, merchantId) => {
  try {
    const { instance } = await getRazorpayInstance(merchantId);
    const twoMinutesLater = Math.floor(Date.now() / 1000) + 120;

    const qrCode = await instance.qrCode.create({
      type: "upi_qr",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: Math.round(amount * 100),
      description: "Amount to be paid",
      name: "Heavens Living",
      close_by: twoMinutesLater,
    });

    return qrCode;
  } catch (err) {
    console.error(
      "Error creating Razorpay QR code:",
      JSON.stringify(err, null, 2)
    );
    throw new Error(err.message || "Failed to create Razorpay QR code");
  }
};

export {
  createRazorpayOrderId,
  verifyPayment,
  razorpayRefund,
  createRazorpayQrCode,
};
