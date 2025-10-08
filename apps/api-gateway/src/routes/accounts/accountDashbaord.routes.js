import express from "express";
import {
  getAccountDashboardDataForDepositSection,
  getAccountDashboardDataForExpenseSection,
  getAccountDashboardDataForIncomeSection,
} from "../../controllers/accounts/dashbaord.controller.js";

const accountDashboardRoutes = express.Router();

accountDashboardRoutes.get("/income", getAccountDashboardDataForIncomeSection);
accountDashboardRoutes.get(
  "/expense",
  getAccountDashboardDataForExpenseSection
);
accountDashboardRoutes.get(
  "/deposit",
  getAccountDashboardDataForDepositSection
);

export default accountDashboardRoutes;
