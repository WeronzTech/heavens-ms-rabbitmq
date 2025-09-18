import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import { getInventoryLogs } from "../services/inventoryLog.service.js";

createResponder(INVENTORY_PATTERN.LOG.GET_INVENTORY_LOGS, async (data) => {
  return await getInventoryLogs(data);
});
