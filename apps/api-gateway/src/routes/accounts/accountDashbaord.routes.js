import express from "express";
import { getAccountDashboardDataForIncomeSection } from "../../controllers/accounts/dashbaord.controller.js";

const accountDashboardRoutes = express.Router();

accountDashboardRoutes.get("/income", getAccountDashboardDataForIncomeSection);

export default accountDashboardRoutes;
