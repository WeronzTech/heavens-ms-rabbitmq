import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  getDailySalesReports,
  downloadSalesReport,
} from "../services/dailySalesReport.service.js";

// 1. Get Filtered Reports (for Dashboard Table)
createResponder(ORDER_PATTERN.SALES_REPORT.GET_DAILY_REPORTS, async (data) => {
  return await getDailySalesReports(data);
});

// 2. Download Report (PDF or CSV)
createResponder(ORDER_PATTERN.SALES_REPORT.DOWNLOAD_REPORT, async (data) => {
  return await downloadSalesReport(data);
});
