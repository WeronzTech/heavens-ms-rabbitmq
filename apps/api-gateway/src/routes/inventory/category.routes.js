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
  hasPermission(PERMISSIONS.CATEGORY_VIEW),
  getCategoriesByPropertyId
);
categoryRoutes.post(
  "/",
  hasPermission(PERMISSIONS.CATEGORY_MANAGE),
  addCategory
);
categoryRoutes.get(
  "/recipe-category/:kitchenId",
  hasPermission(PERMISSIONS.CATEGORY_VIEW),
  getRecipeCategoriesByKitchen
);
categoryRoutes.get(
  "/recipe-category-id/:id",
  hasPermission(PERMISSIONS.CATEGORY_VIEW),
  getRecipeCategoryById
);
categoryRoutes.post(
  "/recipe-category",
  hasPermission(PERMISSIONS.CATEGORY_MANAGE),
  createRecipeCategory
);
categoryRoutes.put(
  "/recipe-category/:id",
  hasPermission(PERMISSIONS.CATEGORY_MANAGE),
  updateRecipeCategory
);
categoryRoutes.delete(
  "/recipe-category/:id",
  hasPermission(PERMISSIONS.CATEGORY_MANAGE),
  deleteRecipeCategory
);

export default categoryRoutes;
