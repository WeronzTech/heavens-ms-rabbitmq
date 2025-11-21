import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  createOrder,
  verifyOrderPayment,
  getOrderById,
  updateOrderStatus,
  getOrdersByCustomer,
  getOrdersByMerchant,
} from "../services/order.service.js";

createResponder(ORDER_PATTERN.ORDER.CREATE_ORDER, async (data) => {
  return await createOrder(data);
});

// ✅ New Responder for Payment Verification
createResponder(ORDER_PATTERN.ORDER.VERIFY_PAYMENT, async (data) => {
  return await verifyOrderPayment(data);
});

createResponder(ORDER_PATTERN.ORDER.GET_ORDER_BY_ID, async (data) => {
  return await getOrderById(data);
});

createResponder(ORDER_PATTERN.ORDER.UPDATE_ORDER_STATUS, async (data) => {
  return await updateOrderStatus(data);
});

createResponder(ORDER_PATTERN.ORDER.GET_ORDERS_BY_CUSTOMER, async (data) => {
  return await getOrdersByCustomer(data);
});

createResponder(ORDER_PATTERN.ORDER.GET_ORDERS_BY_MERCHANT, async (data) => {
  return await getOrdersByMerchant(data);
});
