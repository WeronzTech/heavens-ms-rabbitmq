import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  createProductCategory,
  getAllProductCategories,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
  updateProductCategoryStatus,
  reorderProductCategories,
} from "../services/productCategory.service.js";

createResponder(
  ORDER_PATTERN.PRODUCT_CATEGORY.CREATE_CATEGORY,
  async (data) => {
    return await createProductCategory(data);
  }
);

createResponder(
  ORDER_PATTERN.PRODUCT_CATEGORY.GET_ALL_CATEGORIES,
  async (data) => {
    return await getAllProductCategories(data);
  }
);

createResponder(
  ORDER_PATTERN.PRODUCT_CATEGORY.GET_CATEGORY_BY_ID,
  async (data) => {
    return await getProductCategoryById(data);
  }
);

createResponder(
  ORDER_PATTERN.PRODUCT_CATEGORY.UPDATE_CATEGORY,
  async (data) => {
    return await updateProductCategory(data);
  }
);

createResponder(
  ORDER_PATTERN.PRODUCT_CATEGORY.DELETE_CATEGORY,
  async (data) => {
    return await deleteProductCategory(data);
  }
);

createResponder(ORDER_PATTERN.PRODUCT_CATEGORY.UPDATE_STATUS, async (data) => {
  return await updateProductCategoryStatus(data);
});

// ✅ Responder for Reordering
createResponder(
  ORDER_PATTERN.PRODUCT_CATEGORY.REORDER_CATEGORIES,
  async (data) => {
    return await reorderProductCategories(data);
  }
);
