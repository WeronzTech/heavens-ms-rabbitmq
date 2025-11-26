import express from "express";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import {
  addDailyRequirement,
  approveDailyRequirement,
  getDailyRequirements,
  rejectDailyRequirement,
  updateDailyRequirement,
} from "../../controllers/inventory/dailyInventoryRequirement.controller.js";

const dailyInventoryRoutes = express.Router();

dailyInventoryRoutes.use(isAuthenticated);

dailyInventoryRoutes
  .route("/")
  .get(hasPermission(PERMISSIONS.INVENTORY_VIEW), getDailyRequirements)
  .post(hasPermission(PERMISSIONS.INVENTORY_MANAGE), addDailyRequirement);

dailyInventoryRoutes
  .route("/:id")
  .put(hasPermission(PERMISSIONS.INVENTORY_MANAGE), updateDailyRequirement)
  .delete(hasPermission(PERMISSIONS.INVENTORY_MANAGE), rejectDailyRequirement);

dailyInventoryRoutes.patch(
  "/:id/approve",
  hasPermission(PERMISSIONS.INVENTORY_MANAGE),
  approveDailyRequirement
);

export default dailyInventoryRoutes;
