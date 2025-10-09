import express from "express";
import {
  getAccountDashboardDataForExpenseSection,
  getAccountDashboardDataForIncomeSection,
  getGSTReportController,

} from "../../controllers/accounts/dashbaord.controller.js";

const accountDashboardRoutes = express.Router();

accountDashboardRoutes.get("/income", getAccountDashboardDataForIncomeSection);
accountDashboardRoutes.get(
  "/expense",
  getAccountDashboardDataForExpenseSection
);

accountDashboardRoutes.get(
  "/gst-report",
  getGSTReportController
);


export default accountDashboardRoutes;
 