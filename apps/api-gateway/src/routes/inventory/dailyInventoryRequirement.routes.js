import express from "express";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import {
  addItemToRequirement,
  // addDailyRequirement,
  approveDailyRequirement,
  getDailyRequirements,
  getInventoryItems,
  rejectDailyRequirement,
  removeItemFromRequirement,
  updateDailyRequirements,
  // updateDailyRequirement,
} from "../../controllers/inventory/dailyInventoryRequirement.controller.js";

const dailyInventoryRoutes = express.Router();

dailyInventoryRoutes.use(isAuthenticated);

dailyInventoryRoutes
  .route("/get")
  .get(hasPermission(PERMISSIONS.INVENTORY_VIEW), getDailyRequirements);

dailyInventoryRoutes
  .route("/inventory-items")
  .get(hasPermission(PERMISSIONS.INVENTORY_VIEW), getInventoryItems);

// dailyInventoryRoutes
//   .route("/add")
//   .post(hasPermission(PERMISSIONS.INVENTORY_MANAGE), addDailyRequirement);

dailyInventoryRoutes
  .route("/:requirementId")
  .post(hasPermission(PERMISSIONS.INVENTORY_MANAGE), addItemToRequirement);

dailyInventoryRoutes
  .route("/:requirementId")
  // .put(hasPermission(PERMISSIONS.INVENTORY_MANAGE), updateDailyRequirement)
  .put(hasPermission(PERMISSIONS.INVENTORY_MANAGE), updateDailyRequirements)
  .delete(hasPermission(PERMISSIONS.INVENTORY_MANAGE), rejectDailyRequirement);

dailyInventoryRoutes
  .route("/remove/:requirementId")
  .delete(
    hasPermission(PERMISSIONS.INVENTORY_MANAGE),
    removeItemFromRequirement
  );

dailyInventoryRoutes.put(
  "/:id/approve",
  hasPermission(PERMISSIONS.INVENTORY_MANAGE),
  approveDailyRequirement
);

export default dailyInventoryRoutes;
