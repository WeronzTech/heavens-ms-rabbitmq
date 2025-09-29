import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  getAllKitchens,
  getKitchens,
  getKitchenById,
  addKitchen,
  editKitchen,
  deleteKitchen,
  addRecipe,
  editRecipe,
  getAllRecipes,
  getRecipeById,
  deleteRecipe,
  getMenuStockAnalysis,
} from "../services/kitchen.service.js";

// Kitchen Responders
createResponder(INVENTORY_PATTERN.KITCHEN.GET_ALL_KITCHENS, async (data) => {
  return await getAllKitchens(data);
});

createResponder(INVENTORY_PATTERN.KITCHEN.GET_KITCHENS_SIMPLE, async (data) => {
  return await getKitchens(data);
});

createResponder(INVENTORY_PATTERN.KITCHEN.GET_KITCHEN_BY_ID, async (data) => {
  return await getKitchenById(data);
});

createResponder(INVENTORY_PATTERN.KITCHEN.ADD_KITCHEN, async (data) => {
  return await addKitchen(data);
});

createResponder(INVENTORY_PATTERN.KITCHEN.EDIT_KITCHEN, async (data) => {
  return await editKitchen(data);
});

createResponder(INVENTORY_PATTERN.KITCHEN.DELETE_KITCHEN, async (data) => {
  return await deleteKitchen(data);
});

// Recipe Responders
createResponder(INVENTORY_PATTERN.RECIPE.ADD_RECIPE, async (data) => {
  return await addRecipe(data);
});

createResponder(INVENTORY_PATTERN.RECIPE.EDIT_RECIPE, async (data) => {
  return await editRecipe(data);
});

createResponder(INVENTORY_PATTERN.RECIPE.GET_ALL_RECIPES, async (data) => {
  return await getAllRecipes(data);
});

createResponder(INVENTORY_PATTERN.RECIPE.GET_RECIPE_BY_ID, async (data) => {
  return await getRecipeById(data);
});

createResponder(INVENTORY_PATTERN.RECIPE.DELETE_RECIPE, async (data) => {
  return await deleteRecipe(data);
});

createResponder(
  INVENTORY_PATTERN.RECIPE.GET_MENU_STOCK_ANALYSIS,
  async (data) => {
    return await getMenuStockAnalysis(data);
  }
);
