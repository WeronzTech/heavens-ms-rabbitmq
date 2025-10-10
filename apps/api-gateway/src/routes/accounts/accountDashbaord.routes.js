import express from "express";
import {
  getAccountDashboardDataForDepositSection,
  getAccountDashboardDataForExpenseSection,
  getAccountDashboardDataForIncomeSection,
  getMonthlyIncomeExpenseSummaryForMainDashboard,
  getGSTReportController,
} from "../../controllers/accounts/dashbaord.controller.js";

const accountDashboardRoutes = express.Router();

accountDashboardRoutes.get(
  "/summary",
  getMonthlyIncomeExpenseSummaryForMainDashboard
);
accountDashboardRoutes.get("/income", getAccountDashboardDataForIncomeSection);
accountDashboardRoutes.get(
  "/expense",
  getAccountDashboardDataForExpenseSection
);
accountDashboardRoutes.get(
  "/deposit",
  getAccountDashboardDataForDepositSection
);

accountDashboardRoutes.get("/gst-report", getGSTReportController);

export default accountDashboardRoutes;
