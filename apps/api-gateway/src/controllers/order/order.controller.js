import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../../libs/patterns/order/order.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const createOrder = (req, res) => {
  // Attach user ID from auth middleware if needed for customer
  const payload = { ...req.body, customer: req.userAuth };
  return handleRPCAndRespond(res, ORDER_PATTERN.ORDER.CREATE_ORDER, payload);
};

export const verifyPayment = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.ORDER.VERIFY_PAYMENT, req.body);
};

export const getOrderById = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.ORDER.GET_ORDER_BY_ID, {
    orderId: req.params.id,
  });
};

export const updateOrderStatus = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.ORDER.UPDATE_ORDER_STATUS, {
    orderId: req.params.id,
    ...req.body,
  });
};

export const getOrdersByCustomer = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.ORDER.GET_ORDERS_BY_CUSTOMER, {
    customerId: req.userAuth, // Assuming logged in user
    ...req.query,
  });
};

export const getOrdersByMerchant = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.ORDER.GET_ORDERS_BY_MERCHANT, {
    merchantId: req.params.merchantId,
    ...req.query,
  });
};
