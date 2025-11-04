import { Router } from "express";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import {
  getProfitAndLoss,
  getBalanceSheet,
} from "../../controllers/accounts/reports.controller.js";

const reportRoutes = Router();

reportRoutes.use(isAuthenticated);
reportRoutes.use(hasPermission(PERMISSIONS.ACCOUNTS_DASHBOARD_VIEW)); // Use a view permission

reportRoutes.get("/profit-and-loss", getProfitAndLoss);
reportRoutes.get("/balance-sheet", getBalanceSheet);

export default reportRoutes;
