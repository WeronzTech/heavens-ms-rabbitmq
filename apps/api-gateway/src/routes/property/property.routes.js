import express from "express";
import {
  createProperty,
  deleteProperty,
  getAllHeavensProperties,
  getClientPropertiesController,
  getPropertyById,
  updateProperty,
} from "../../controllers/property/property.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const propertyRoutes = express.Router();

propertyRoutes.use(isAuthenticated);

propertyRoutes.get(
  "/my-properties",
  hasPermission(PERMISSIONS.PROPERTY_VIEW),
  getClientPropertiesController
);
propertyRoutes.get("/heavens-properties", getAllHeavensProperties);
propertyRoutes.get(
  "/:id",
  hasPermission(PERMISSIONS.PROPERTY_VIEW),
  getPropertyById
);

propertyRoutes.post(
  "/register",
  hasPermission(PERMISSIONS.PROPERTY_MANAGE),
  createProperty
);

propertyRoutes.put(
  "/edit/:id",
  hasPermission(PERMISSIONS.PROPERTY_MANAGE),
  updateProperty
);
propertyRoutes.delete(
  "/delete/:id",
  hasPermission(PERMISSIONS.PROPERTY_MANAGE),
  deleteProperty
);

export default propertyRoutes;
