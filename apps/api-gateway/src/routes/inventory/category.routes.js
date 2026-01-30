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
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const categoryRoutes = express.Router();

categoryRoutes.use(isAuthenticated);

categoryRoutes.get(
  "/get-by-property",
  hasPermission(PERMISSIONS.RECIPE_VIEW),
  getCategoriesByPropertyId,
);
categoryRoutes.post(
  "/",
  hasPermission(PERMISSIONS.RECIPE_MANAGE),
  addCategory,
);
categoryRoutes.get(
  "/recipe-category/:kitchenId",
  hasPermission(PERMISSIONS.RECIPE_VIEW),
  getRecipeCategoriesByKitchen,
);
categoryRoutes.get(
  "/recipe-category-id/:id",
  hasPermission(PERMISSIONS.RECIPE_VIEW),
  getRecipeCategoryById,
);
categoryRoutes.post(
  "/recipe-category",
  hasPermission(PERMISSIONS.RECIPE_MANAGE),
  createRecipeCategory,
);
categoryRoutes.put(
  "/recipe-category/:id",
  hasPermission(PERMISSIONS.RECIPE_MANAGE),
  updateRecipeCategory,
);
categoryRoutes.delete(
  "/recipe-category/:id",
  hasPermission(PERMISSIONS.RECIPE_MANAGE),
  deleteRecipeCategory,
);

export default categoryRoutes;
