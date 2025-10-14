import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import {
  createGamingItem,
  deleteGamingItem,
  getAllGamingItems,
  getAllOrders,
  getGamingItemById,
  getOrderById,
  initiateGamingOrder,
  updateGamingItem,
  updateGamingItemStatus,
  updateOrderStatus,
  verifyPaymentAndConfirmOrder,
} from "../services/gaming.service.js";

createResponder(USER_PATTERN.GAMING.ITEM.CREATE, (data) =>
  createGamingItem(data)
);
createResponder(USER_PATTERN.GAMING.ITEM.GET_ALL, () => getAllGamingItems());
createResponder(USER_PATTERN.GAMING.ITEM.GET_BY_ID, (data) =>
  getGamingItemById(data)
);
createResponder(USER_PATTERN.GAMING.ITEM.UPDATE, (data) =>
  updateGamingItem(data)
);
createResponder(USER_PATTERN.GAMING.ITEM.UPDATE_STATUS, (data) =>
  updateGamingItemStatus(data)
);
createResponder(USER_PATTERN.GAMING.ITEM.DELETE, (data) =>
  deleteGamingItem(data)
);

// --- GAMING ORDER & PAYMENT RESPONDERS ---
createResponder(USER_PATTERN.GAMING.ORDER.INITIATE, (data) =>
  initiateGamingOrder(data)
);
createResponder(USER_PATTERN.GAMING.ORDER.VERIFY_AND_CONFIRM, (data) =>
  verifyPaymentAndConfirmOrder(data)
);
createResponder(USER_PATTERN.GAMING.ORDER.UPDATE_STATUS, (data) =>
  updateOrderStatus(data)
);
createResponder(USER_PATTERN.GAMING.ORDER.GET_ALL, () => getAllOrders());
createResponder(USER_PATTERN.GAMING.ORDER.GET_BY_ID, (data) =>
  getOrderById(data)
);
