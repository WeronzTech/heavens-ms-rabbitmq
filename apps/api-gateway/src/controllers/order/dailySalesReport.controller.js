import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../../libs/patterns/order/order.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);

    // For the download endpoint, if you want the Browser to trigger a download directly
    // from this API call, you might need extra logic here to handle headers.
    // However, keeping it simple (JSON response) is safer for Microservices.
    // The frontend can take the "fileContent" (Base64/String) and create the file.
    return res.status(response.status || 500).json(response);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

// GET /api/reports/daily?startDate=...&endDate=...&page=1
export const getDailySalesReports = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.SALES_REPORT.GET_DAILY_REPORTS,
    req.query // Uses query params for filtering
  );

// GET /api/reports/download?startDate=...&endDate=...&format=pdf
export const downloadSalesReport = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.SALES_REPORT.DOWNLOAD_REPORT,
    req.query // Uses query params for download options
  );
