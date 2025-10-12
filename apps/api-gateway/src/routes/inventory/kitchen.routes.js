import express from "express";
import {
  addKitchen,
  addRecipe,
  deleteKitchen,
  deleteRecipe,
  editKitchen,
  editRecipe,
  getAllKitchens,
  getAllRecipes,
  getKitchenById,
  getKitchens,
  getMenuStockAnalysis,
  getRecipeById,
} from "../../controllers/inventory/kitchen.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const kitchenRoutes = express.Router();

kitchenRoutes.use(isAuthenticated);

kitchenRoutes.post(
  "/recipes",
  hasPermission(PERMISSIONS.KITCHEN_MANAGE),
  addRecipe
);
kitchenRoutes.put(
  "/recipes/:id",
  hasPermission(PERMISSIONS.KITCHEN_MANAGE),
  editRecipe
);
kitchenRoutes.get(
  "/recipes",
  hasPermission(PERMISSIONS.KITCHEN_VIEW),
  getAllRecipes
);
kitchenRoutes.get(
  "/recipes/:id",
  hasPermission(PERMISSIONS.KITCHEN_VIEW),
  getRecipeById
);
kitchenRoutes.delete(
  "/recipes/:id",
  hasPermission(PERMISSIONS.KITCHEN_MANAGE),
  deleteRecipe
);
kitchenRoutes.get(
  "/serving",
  hasPermission(PERMISSIONS.KITCHEN_VIEW),
  getMenuStockAnalysis
);
kitchenRoutes.get("/", hasPermission(PERMISSIONS.KITCHEN_VIEW), getAllKitchens);
kitchenRoutes.get(
  "/getKitchens",
  hasPermission(PERMISSIONS.KITCHEN_VIEW),
  getKitchens
);
kitchenRoutes.get(
  "/:id",
  hasPermission(PERMISSIONS.KITCHEN_VIEW),
  getKitchenById
);
kitchenRoutes.post("/", hasPermission(PERMISSIONS.KITCHEN_MANAGE), addKitchen);
kitchenRoutes.put(
  "/:id",
  hasPermission(PERMISSIONS.KITCHEN_MANAGE),
  editKitchen
);
kitchenRoutes.delete(
  "/:id",
  hasPermission(PERMISSIONS.KITCHEN_MANAGE),
  deleteKitchen
);

export default kitchenRoutes;
