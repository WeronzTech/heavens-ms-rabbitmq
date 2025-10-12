import express from "express";
import { getDashboardStats } from "../../controllers/property/dashboard.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const dashboardRoutes = express.Router();

dashboardRoutes.use(isAuthenticated);

dashboardRoutes.get(
  "/stats",
  hasPermission(PERMISSIONS.PROPERTY_DASHBOARD_VIEW),
  getDashboardStats
);

export default dashboardRoutes;
