import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";

import {
  addSubCategory,
  getSubCategories,
} from "../services/subCategory.service.js";

createResponder(
  INVENTORY_PATTERN.SUB_CATEGORY.ADD_SUB_CATEGORY,
  async (data) => {
    return await addSubCategory(data);
  }
);

createResponder(
  INVENTORY_PATTERN.SUB_CATEGORY.GET_SUB_CATEGORIES,
  async (data) => {
    return await getSubCategories(data);
  }
);