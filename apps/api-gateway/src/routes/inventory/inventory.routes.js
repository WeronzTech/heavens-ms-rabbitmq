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

const inventoryRoutes = express.Router();

inventoryRoutes.post("/add", addInventory);
inventoryRoutes.get("/", getInventory);
inventoryRoutes.get("/low-stock", getLowStockItems);
inventoryRoutes.get("/dead-stock", getDeadStockLogs);
inventoryRoutes.get("/dead-stock-report", downloadDeadStockReport);
inventoryRoutes.get("/weekly-usage-report", downloadWeeklyUsageReport);
inventoryRoutes.get("/:inventoryId", getInventoryById);
inventoryRoutes.put("/update/:inventoryId", editInventory);
inventoryRoutes.delete("/delete/:inventoryId", deleteInventory);

// Stock management routes
inventoryRoutes.post("/add-stock/:inventoryId", updateStock);
inventoryRoutes.post("/remove-stock/:inventoryId", useInventory);
inventoryRoutes.post("/dead-stock/:inventoryId", addDeadStock);
inventoryRoutes.post("/download-low-stock-csv", downloadLowStockCsv);

//category routes

inventoryRoutes.post("/apply-queued/:queuedId", manuallyApplyQueuedInventory);

export default inventoryRoutes;
