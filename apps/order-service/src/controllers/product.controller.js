import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  createProduct,
  getProductsByCategory,
  getProductById,
  updateProduct,
  deleteProduct,
  reorderProducts,
  getMerchantProducts,
} from "../services/product.service.js";

createResponder(ORDER_PATTERN.PRODUCT.CREATE_PRODUCT, async (data) => {
  return await createProduct(data);
});

createResponder(
  ORDER_PATTERN.PRODUCT.GET_PRODUCTS_BY_CATEGORY,
  async (data) => {
    return await getProductsByCategory(data);
  }
);

createResponder(ORDER_PATTERN.PRODUCT.GET_MERCHANT_PRODUCTS, async (data) => {
  return await getMerchantProducts(data);
});

createResponder(ORDER_PATTERN.PRODUCT.GET_PRODUCT_BY_ID, async (data) => {
  return await getProductById(data);
});

createResponder(ORDER_PATTERN.PRODUCT.UPDATE_PRODUCT, async (data) => {
  return await updateProduct(data);
});

createResponder(ORDER_PATTERN.PRODUCT.DELETE_PRODUCT, async (data) => {
  return await deleteProduct(data);
});

createResponder(ORDER_PATTERN.PRODUCT.REORDER_PRODUCTS, async (data) => {
  return await reorderProducts(data);
});
