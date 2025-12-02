import { Router } from "express";
import {
  getDailySalesReports,
  downloadSalesReport,
} from "../../controllers/order/dailySalesReport.controller.js"; // Adjust path if needed
import { isAuthenticated } from "../../middleware/isAuthenticated.js";

const salesReportRoutes = Router();

// Protect all report routes
salesReportRoutes.use(isAuthenticated);

// GET /api/v1/reports/daily?startDate=...&endDate=...&page=1
salesReportRoutes.get("/daily", getDailySalesReports);

// GET /api/v1/reports/download?startDate=...&endDate=...&format=pdf
salesReportRoutes.get("/download", downloadSalesReport);

export default salesReportRoutes;
