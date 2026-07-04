import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../../libs/patterns/inventory/inventory.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const addSubCategory = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.SUB_CATEGORY.ADD_SUB_CATEGORY,
    req.body
  );

export const getSubCategories = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.SUB_CATEGORY.GET_SUB_CATEGORIES,
    req.query
  );