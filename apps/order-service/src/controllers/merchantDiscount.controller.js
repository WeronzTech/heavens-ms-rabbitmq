import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  createMerchantDiscount,
  getAllMerchantDiscounts,
  getMerchantDiscountById,
  updateMerchantDiscount,
  deleteMerchantDiscount,
  updateMerchantDiscountStatus,
} from "../services/merchantDiscount.service.js";

createResponder(
  ORDER_PATTERN.MERCHANT_DISCOUNT.CREATE_DISCOUNT,
  async (data) => {
    return await createMerchantDiscount(data);
  }
);

createResponder(
  ORDER_PATTERN.MERCHANT_DISCOUNT.GET_ALL_DISCOUNTS,
  async (data) => {
    return await getAllMerchantDiscounts(data);
  }
);

createResponder(
  ORDER_PATTERN.MERCHANT_DISCOUNT.GET_DISCOUNT_BY_ID,
  async (data) => {
    return await getMerchantDiscountById(data);
  }
);

createResponder(
  ORDER_PATTERN.MERCHANT_DISCOUNT.UPDATE_DISCOUNT,
  async (data) => {
    return await updateMerchantDiscount(data);
  }
);

createResponder(
  ORDER_PATTERN.MERCHANT_DISCOUNT.DELETE_DISCOUNT,
  async (data) => {
    return await deleteMerchantDiscount(data);
  }
);

createResponder(ORDER_PATTERN.MERCHANT_DISCOUNT.UPDATE_STATUS, async (data) => {
  return await updateMerchantDiscountStatus(data);
});
