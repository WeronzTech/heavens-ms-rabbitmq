import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  addInventory,
  getInventory,
  editInventory,
  deleteInventory,
  useInventory,
  addDeadStock,
  getDeadStockLogs,
  updateStock,
  getLowStockItems,
  downloadLowStockCsv,
  getInventoryById,
  manuallyApplyQueuedInventory,
  downloadDeadStockReport,
  downloadWeeklyUsageReport,
} from "../services/inventory.service.js";

createResponder(INVENTORY_PATTERN.INVENTORY.ADD_INVENTORY, async (data) => {
  return await addInventory(data);
});

createResponder(INVENTORY_PATTERN.INVENTORY.GET_INVENTORY, async (data) => {
  return await getInventory(data);
});

createResponder(INVENTORY_PATTERN.INVENTORY.EDIT_INVENTORY, async (data) => {
  return await editInventory(data);
});

createResponder(INVENTORY_PATTERN.INVENTORY.DELETE_INVENTORY, async (data) => {
  return await deleteInventory(data);
});

createResponder(INVENTORY_PATTERN.INVENTORY.USE_INVENTORY, async (data) => {
  return await useInventory(data);
});

createResponder(INVENTORY_PATTERN.INVENTORY.ADD_DEAD_STOCK, async (data) => {
  return await addDeadStock(data);
});

createResponder(
  INVENTORY_PATTERN.INVENTORY.GET_DEAD_STOCK_LOGS,
  async (data) => {
    return await getDeadStockLogs(data);
  }
);

createResponder(INVENTORY_PATTERN.INVENTORY.UPDATE_STOCK, async (data) => {
  return await updateStock(data);
});

createResponder(
  INVENTORY_PATTERN.INVENTORY.GET_LOW_STOCK_ITEMS,
  async (data) => {
    return await getLowStockItems(data);
  }
);

createResponder(
  INVENTORY_PATTERN.INVENTORY.DOWNLOAD_LOW_STOCK_CSV,
  async (data) => {
    return await downloadLowStockCsv(data);
  }
);

createResponder(
  INVENTORY_PATTERN.INVENTORY.GET_INVENTORY_BY_ID,
  async (data) => {
    return await getInventoryById(data);
  }
);

createResponder(
  INVENTORY_PATTERN.INVENTORY.MANUALLY_APPLY_QUEUED,
  async (data) => {
    return await manuallyApplyQueuedInventory(data);
  }
);

createResponder(
  INVENTORY_PATTERN.INVENTORY.DOWNLOAD_DEAD_STOCK_REPORT,
  async (data) => {
    return await downloadDeadStockReport(data);
  }
);

createResponder(
  INVENTORY_PATTERN.INVENTORY.DOWNLOAD_WEEKLY_USAGE_REPORT,
  async (data) => {
    return await downloadWeeklyUsageReport(data);
  }
);
