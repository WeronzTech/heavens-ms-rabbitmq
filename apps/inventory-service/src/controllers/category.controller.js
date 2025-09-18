import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  addCategory,
  createRecipeCategory,
  deleteRecipeCategory,
  getCategoriesByPropertyId,
  getRecipeCategoriesByKitchen,
  getRecipeCategoryById,
  updateRecipeCategory,
} from "../services/category.service.js";

createResponder(INVENTORY_PATTERN.CATEGORY.ADD_CATEGORY, async (data) => {
  return await addCategory(data);
});

createResponder(
  INVENTORY_PATTERN.CATEGORY.GET_CATEGORIES_BY_PROPERTY,
  async (data) => {
    return await getCategoriesByPropertyId(data);
  }
);

createResponder(
  INVENTORY_PATTERN.CATEGORY.CREATE_RECIPE_CATEGORY,
  async (data) => {
    return await createRecipeCategory(data);
  }
);

createResponder(
  INVENTORY_PATTERN.CATEGORY.GET_RECIPE_CATEGORIES_BY_KITCHEN,
  async (data) => {
    return await getRecipeCategoriesByKitchen(data);
  }
);

createResponder(
  INVENTORY_PATTERN.CATEGORY.GET_RECIPE_CATEGORY_BY_ID,
  async (data) => {
    return await getRecipeCategoryById(data);
  }
);

createResponder(
  INVENTORY_PATTERN.CATEGORY.UPDATE_RECIPE_CATEGORY,
  async (data) => {
    return await updateRecipeCategory(data);
  }
);

createResponder(
  INVENTORY_PATTERN.CATEGORY.DELETE_RECIPE_CATEGORY,
  async (data) => {
    return await deleteRecipeCategory(data);
  }
);
