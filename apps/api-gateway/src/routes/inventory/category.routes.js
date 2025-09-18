import express from "express";
import {
  addCategory,
  createRecipeCategory,
  deleteRecipeCategory,
  getCategoriesByPropertyId,
  getRecipeCategoriesByKitchen,
  getRecipeCategoryById,
  updateRecipeCategory,
} from "../../controllers/inventory/category.controller.js";

const categoryRoutes = express.Router();

categoryRoutes.get("/", getCategoriesByPropertyId);
categoryRoutes.post("/", addCategory);
categoryRoutes.get("/recipe-category/:kitchenId", getRecipeCategoriesByKitchen);
categoryRoutes.get("/recipe-category-id/:id", getRecipeCategoryById);
categoryRoutes.post("/recipe-category", createRecipeCategory);
categoryRoutes.put("/recipe-category/:id", updateRecipeCategory);
categoryRoutes.delete("/recipe-category/:id", deleteRecipeCategory);

export default categoryRoutes;
