import express from "express";
import {
  getAccountDashboardDataForDepositSection,
  getAccountDashboardDataForExpenseSection,
  getAccountDashboardDataForIncomeSection,
  getMonthlyIncomeExpenseSummaryForMainDashboard,
  getGSTReportController,
} from "../../controllers/accounts/dashbaord.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
// import { hasPermission } from "../../middleware/hasPermission.js";
// import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const accountDashboardRoutes = express.Router();

accountDashboardRoutes.use(isAuthenticated);

accountDashboardRoutes.get(
  "/summary",
  getMonthlyIncomeExpenseSummaryForMainDashboard,
);
accountDashboardRoutes.get("/income", getAccountDashboardDataForIncomeSection);
accountDashboardRoutes.get(
  "/expense",
  getAccountDashboardDataForExpenseSection,
);
accountDashboardRoutes.get(
  "/deposit",
  getAccountDashboardDataForDepositSection,
);

accountDashboardRoutes.get("/gst-report", getGSTReportController);

export default accountDashboardRoutes;
