import express from "express";
import {
  addFloor,
  updateFloor,
  deleteFloor,
  getFloorById,
  getFloorsByPropertyId,
} from "../../controllers/property/floor.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const floorRoutes = express.Router();

// Apply authentication middleware to all floor routes
floorRoutes.use(isAuthenticated);

// Create a new floor
floorRoutes.post(
  "/",
  hasPermission(PERMISSIONS.PROPERTY_MANAGE), // Assuming a general property manage permission
  addFloor
);

// Get all floors for a specific property (using query ?propertyId=...)
floorRoutes.get(
  "/",
  hasPermission(PERMISSIONS.PROPERTY_VIEW), // Assuming a general property view permission
  getFloorsByPropertyId
);

// Get a single floor by its ID
floorRoutes.get("/:id", hasPermission(PERMISSIONS.PROPERTY_VIEW), getFloorById);

// Update an existing floor
floorRoutes.put(
  "/:id",
  hasPermission(PERMISSIONS.PROPERTY_MANAGE),
  updateFloor
);

// Delete a floor
floorRoutes.delete(
  "/:id",
  hasPermission(PERMISSIONS.PROPERTY_MANAGE),
  deleteFloor
);

export default floorRoutes;
