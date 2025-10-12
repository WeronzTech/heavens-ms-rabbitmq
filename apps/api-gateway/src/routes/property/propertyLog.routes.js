import express from "express";
import { getActivityLogsController } from "../../controllers/property/log.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const propertyLogRoutes = express.Router();

propertyLogRoutes.use(isAuthenticated);

propertyLogRoutes.get(
  "/get",
  hasPermission(PERMISSIONS.LOGS_PROPERTY_VIEW),
  getActivityLogsController
);

export default propertyLogRoutes;
