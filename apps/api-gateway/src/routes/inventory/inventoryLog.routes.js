import express from "express";
import { getInventoryLogs } from "../../controllers/inventory/inventoryLog.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const inventoryLogRoutes = express.Router();

inventoryLogRoutes.use(isAuthenticated);

inventoryLogRoutes.get(
  "/get",
  hasPermission(PERMISSIONS.LOGS_INVENTORY_VIEW),
  getInventoryLogs
);

export default inventoryLogRoutes;
