import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  createProductDiscount,
  getAllProductDiscounts,
  getProductDiscountById,
  updateProductDiscount,
  deleteProductDiscount,
  updateProductDiscountStatus,
} from "../services/productDiscount.service.js";

createResponder(
  ORDER_PATTERN.PRODUCT_DISCOUNT.CREATE_DISCOUNT,
  async (data) => {
    console.log(data);
    return await createProductDiscount(data);
  }
);

createResponder(
  ORDER_PATTERN.PRODUCT_DISCOUNT.GET_ALL_DISCOUNTS,
  async (data) => {
    return await getAllProductDiscounts(data);
  }
);

createResponder(
  ORDER_PATTERN.PRODUCT_DISCOUNT.GET_DISCOUNT_BY_ID,
  async (data) => {
    return await getProductDiscountById(data);
  }
);

createResponder(
  ORDER_PATTERN.PRODUCT_DISCOUNT.UPDATE_DISCOUNT,
  async (data) => {
    return await updateProductDiscount(data);
  }
);

createResponder(
  ORDER_PATTERN.PRODUCT_DISCOUNT.DELETE_DISCOUNT,
  async (data) => {
    return await deleteProductDiscount(data);
  }
);

createResponder(ORDER_PATTERN.PRODUCT_DISCOUNT.UPDATE_STATUS, async (data) => {
  return await updateProductDiscountStatus(data);
});
