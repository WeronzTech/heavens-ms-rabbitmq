import express from "express";
import {
  getAccountDashboardDataForDepositSection,
  getAccountDashboardDataForExpenseSection,
  getAccountDashboardDataForIncomeSection,
  getMonthlyIncomeExpenseSummaryForMainDashboard,
  getGSTReportController,
} from "../../controllers/accounts/dashbaord.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const accountDashboardRoutes = express.Router();

accountDashboardRoutes.use(isAuthenticated);

accountDashboardRoutes.get(
  "/summary",
  hasPermission(PERMISSIONS.ACCOUNTS_DASHBOARD_VIEW),
  getMonthlyIncomeExpenseSummaryForMainDashboard
);
accountDashboardRoutes.get(
  "/income",
  hasPermission(PERMISSIONS.ACCOUNTS_DASHBOARD_VIEW),
  getAccountDashboardDataForIncomeSection
);
accountDashboardRoutes.get(
  "/expense",
  hasPermission(PERMISSIONS.ACCOUNTS_DASHBOARD_VIEW),
  getAccountDashboardDataForExpenseSection
);
accountDashboardRoutes.get(
  "/deposit",
  hasPermission(PERMISSIONS.ACCOUNTS_DASHBOARD_VIEW),
  getAccountDashboardDataForDepositSection
);

accountDashboardRoutes.get(
  "/gst-report",
  hasPermission(PERMISSIONS.ACCOUNTS_DASHBOARD_VIEW),
  getGSTReportController
);

export default accountDashboardRoutes;
