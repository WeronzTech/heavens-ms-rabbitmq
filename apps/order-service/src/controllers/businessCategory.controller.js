import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  createBusinessCategory,
  getAllBusinessCategories,
  getBusinessCategoryById,
  updateBusinessCategory,
  deleteBusinessCategory,
  updateBusinessCategoryStatus,
} from "../services/businessCategory.service.js";

createResponder(
  ORDER_PATTERN.BUSINESS_CATEGORY.CREATE_BUSINESS_CATEGORY,
  async (data) => {
    return await createBusinessCategory(data);
  }
);

createResponder(
  ORDER_PATTERN.BUSINESS_CATEGORY.GET_ALL_BUSINESS_CATEGORIES,
  async (data) => {
    return await getAllBusinessCategories(data);
  }
);

createResponder(
  ORDER_PATTERN.BUSINESS_CATEGORY.GET_BUSINESS_CATEGORY_BY_ID,
  async (data) => {
    return await getBusinessCategoryById(data);
  }
);

createResponder(
  ORDER_PATTERN.BUSINESS_CATEGORY.UPDATE_BUSINESS_CATEGORY,
  async (data) => {
    return await updateBusinessCategory(data);
  }
);

createResponder(
  ORDER_PATTERN.BUSINESS_CATEGORY.DELETE_BUSINESS_CATEGORY,
  async (data) => {
    return await deleteBusinessCategory(data);
  }
);

createResponder(ORDER_PATTERN.BUSINESS_CATEGORY.UPDATE_STATUS, async (data) => {
  return await updateBusinessCategoryStatus(data);
});
