import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../../libs/patterns/inventory/inventory.pattern.js";

export const getKitchensAccessibleToProperty = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.INTERNAL.GET_ACCESSIBLE_KITCHENS,
      req.query
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(
      "API Gateway Error in getKitchensAccessibleToProperty:",
      error
    );
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};
