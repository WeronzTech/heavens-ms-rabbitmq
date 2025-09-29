import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../../libs/patterns/inventory/inventory.pattern.js";

// --- Kitchen Controllers ---

export const getAllKitchens = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.KITCHEN.GET_ALL_KITCHENS,
      req.query
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in getAllKitchens:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const getKitchens = async (req, res) => {
  try {
    const { propertyId } = req.query;
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.KITCHEN.GET_KITCHENS_SIMPLE,
      { propertyId }
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in getKitchens:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const getKitchenById = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.KITCHEN.GET_KITCHEN_BY_ID,
      { id: req.params.id }
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in getKitchenById:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const addKitchen = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.KITCHEN.ADD_KITCHEN,
      req.body
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in addKitchen:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const editKitchen = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.KITCHEN.EDIT_KITCHEN,
      { id: req.params.id, ...req.body }
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in editKitchen:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const deleteKitchen = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.KITCHEN.DELETE_KITCHEN,
      { id: req.params.id }
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in deleteKitchen:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

// --- Recipe Controllers ---

export const addRecipe = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.RECIPE.ADD_RECIPE,
      req.body
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in addRecipe:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const editRecipe = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.RECIPE.EDIT_RECIPE,
      {
        id: req.params.id,
        updates: req.body,
      }
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in editRecipe:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const getAllRecipes = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.RECIPE.GET_ALL_RECIPES,
      req.query
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in getAllRecipes:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const getRecipeById = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.RECIPE.GET_RECIPE_BY_ID,
      { id: req.params.id }
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in getRecipeById:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const deleteRecipe = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.RECIPE.DELETE_RECIPE,
      { id: req.params.id }
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in deleteRecipe:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const getMenuStockAnalysis = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.RECIPE.GET_MENU_STOCK_ANALYSIS,
      req.query
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in getMenuStockAnalysis:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};
