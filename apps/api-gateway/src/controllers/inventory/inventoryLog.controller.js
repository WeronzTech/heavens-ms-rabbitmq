import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../../libs/patterns/inventory/inventory.pattern.js";

export const getInventoryLogs = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.LOG.GET_INVENTORY_LOGS,
      req.query
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("API Gateway Error in getInventoryLogs:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};
