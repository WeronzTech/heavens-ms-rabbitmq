import express from "express";
import {
  getAccountDashboardDataForExpenseSection,
  getAccountDashboardDataForIncomeSection,
} from "../../controllers/accounts/dashbaord.controller.js";

const accountDashboardRoutes = express.Router();

accountDashboardRoutes.get("/income", getAccountDashboardDataForIncomeSection);
accountDashboardRoutes.get(
  "/expense",
  getAccountDashboardDataForExpenseSection
);

export default accountDashboardRoutes;
