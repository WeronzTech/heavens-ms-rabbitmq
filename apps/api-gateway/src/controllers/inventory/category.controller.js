import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../../libs/patterns/inventory/inventory.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const addCategory = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.CATEGORY.ADD_CATEGORY, req.body);

export const getCategoriesByPropertyId = (req, res) => {
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.CATEGORY.GET_CATEGORIES_BY_PROPERTY,
    req.query
  );
};

export const createRecipeCategory = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.CATEGORY.CREATE_RECIPE_CATEGORY,
    req.body
  );

export const getRecipeCategoriesByKitchen = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.CATEGORY.GET_RECIPE_CATEGORIES_BY_KITCHEN,
    { kitchenId: req.params.kitchenId }
  );

export const getRecipeCategoryById = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.CATEGORY.GET_RECIPE_CATEGORY_BY_ID,
    { id: req.params.id }
  );

export const updateRecipeCategory = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.CATEGORY.UPDATE_RECIPE_CATEGORY, {
    ...req.body,
    id: req.params.id,
  });

export const deleteRecipeCategory = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.CATEGORY.DELETE_RECIPE_CATEGORY, {
    id: req.params.id,
  });
