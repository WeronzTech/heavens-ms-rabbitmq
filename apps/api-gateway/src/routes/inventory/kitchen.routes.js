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

const kitchenRoutes = express.Router();

kitchenRoutes.post("/recipes", addRecipe);
kitchenRoutes.put("/recipes/:id", editRecipe);
kitchenRoutes.get("/recipes", getAllRecipes);
kitchenRoutes.get("/recipes/:id", getRecipeById);
kitchenRoutes.delete("/recipes/:id", deleteRecipe);
kitchenRoutes.get("/serving", getMenuStockAnalysis);
kitchenRoutes.get("/", getAllKitchens);
kitchenRoutes.get("/getKitchens", getKitchens);
kitchenRoutes.get("/:id", getKitchenById);
kitchenRoutes.post("/", addKitchen);
kitchenRoutes.put("/:id", editKitchen);
kitchenRoutes.delete("/:id", deleteKitchen);

export default kitchenRoutes;
