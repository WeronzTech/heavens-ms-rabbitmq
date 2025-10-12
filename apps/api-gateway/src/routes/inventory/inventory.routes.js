import express from "express";
import {
  addInventory,
  getInventory,
  getInventoryById,
  deleteInventory,
  editInventory,
  useInventory,
  updateStock,
  getLowStockItems,
  downloadLowStockCsv,
  manuallyApplyQueuedInventory,
  addDeadStock,
  getDeadStockLogs,
  downloadDeadStockReport,
  downloadWeeklyUsageReport,
} from "../../controllers/inventory/inventory.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const inventoryRoutes = express.Router();

inventoryRoutes.use(isAuthenticated);

inventoryRoutes.post(
  "/add",
  hasPermission(PERMISSIONS.INVENTORY_MANAGE),
  addInventory
);
inventoryRoutes.get(
  "/",
  hasPermission(PERMISSIONS.INVENTORY_VIEW),
  getInventory
);
inventoryRoutes.get(
  "/low-stock",
  hasPermission(PERMISSIONS.INVENTORY_VIEW),
  getLowStockItems
);
inventoryRoutes.get(
  "/dead-stock",
  hasPermission(PERMISSIONS.INVENTORY_VIEW),
  getDeadStockLogs
);
inventoryRoutes.get(
  "/dead-stock-report",
  hasPermission(PERMISSIONS.INVENTORY_VIEW),
  downloadDeadStockReport
);
inventoryRoutes.get(
  "/weekly-usage-report",
  hasPermission(PERMISSIONS.INVENTORY_VIEW),
  downloadWeeklyUsageReport
);
inventoryRoutes.get(
  "/:inventoryId",
  hasPermission(PERMISSIONS.INVENTORY_VIEW),
  getInventoryById
);
inventoryRoutes.put(
  "/update/:inventoryId",
  hasPermission(PERMISSIONS.INVENTORY_MANAGE),
  editInventory
);
inventoryRoutes.delete(
  "/delete/:inventoryId",
  hasPermission(PERMISSIONS.INVENTORY_MANAGE),
  deleteInventory
);

// Stock management routes
inventoryRoutes.post(
  "/add-stock/:inventoryId",
  hasPermission(PERMISSIONS.INVENTORY_MANAGE),
  updateStock
);
inventoryRoutes.post(
  "/remove-stock/:inventoryId",
  hasPermission(PERMISSIONS.INVENTORY_MANAGE),
  useInventory
);
inventoryRoutes.post(
  "/dead-stock/:inventoryId",
  hasPermission(PERMISSIONS.INVENTORY_MANAGE),
  addDeadStock
);
inventoryRoutes.post(
  "/download-low-stock-csv",
  hasPermission(PERMISSIONS.INVENTORY_VIEW),
  downloadLowStockCsv
);

//category routes

inventoryRoutes.post(
  "/apply-queued/:queuedId",
  hasPermission(PERMISSIONS.INVENTORY_MANAGE),
  manuallyApplyQueuedInventory
);

export default inventoryRoutes;
