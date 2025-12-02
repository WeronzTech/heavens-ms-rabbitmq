import DailySalesReport from "../models/dailySalesReport.model.js";
import PDFDocument from "pdfkit";
import { Parser } from "json2csv";

// Helper: Build Date Query
const buildDateQuery = (startDate, endDate) => {
  const query = {};
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    query.date = {
      $gte: start,
      $lte: end,
    };
  }
  return query;
};

// 1. GET Reports with Filtering & Pagination
export const getDailySalesReports = async (data) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = data;

    const query = buildDateQuery(startDate, endDate);

    const skip = (page - 1) * limit;

    // Run query and count in parallel
    const [reports, total] = await Promise.all([
      DailySalesReport.find(query)
        .sort({ date: -1 }) // Newest first
        .skip(skip)
        .limit(parseInt(limit)),
      DailySalesReport.countDocuments(query),
    ]);

    return {
      status: 200,
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching reports:", error);
    return { status: 500, message: error.message };
  }
};

// 2. DOWNLOAD Report (Handles both PDF and CSV)
export const downloadSalesReport = async (data) => {
  try {
    const { startDate, endDate, format = "csv" } = data; // format: 'pdf' or 'csv'

    const query = buildDateQuery(startDate, endDate);

    // Fetch ALL matching data (no pagination for downloads)
    const reports = await DailySalesReport.find(query).sort({ date: 1 });

    if (!reports || reports.length === 0) {
      return { status: 404, message: "No data found for the selected range" };
    }

    // --- CSV Generation ---
    if (format.toLowerCase() === "csv") {
      const fields = [
        {
          label: "Date",
          value: (row) => new Date(row.date).toLocaleDateString(),
        },
        { label: "Total Orders", value: "metrics.totalOrders" },
        { label: "Successful", value: "metrics.successfulOrders" },
        { label: "Cancelled", value: "metrics.cancelledOrders" },
        { label: "Revenue", value: "metrics.totalRevenue" },
        { label: "Tax", value: "metrics.totalTaxCollected" },
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(reports);

      return {
        status: 200,
        data: {
          fileType: "text/csv",
          fileName: `sales_report_${Date.now()}.csv`,
          fileContent: csv, // Frontend can create a Blob from this
        },
      };
    }

    // --- PDF Generation ---
    if (format.toLowerCase() === "pdf") {
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));

      // Wait for PDF to finish
      const pdfBufferPromise = new Promise((resolve) => {
        doc.on("end", () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
      });

      // -- PDF Content --
      doc.fontSize(20).text("Daily Sales Report", { align: "center" });
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, {
        align: "center",
      });
      doc.moveDown();

      // Simple Table Header
      const tableTop = 150;
      const colX = { date: 50, orders: 150, rev: 250, tax: 350, status: 450 };

      doc.font("Helvetica-Bold");
      doc.text("Date", colX.date, tableTop);
      doc.text("Orders", colX.orders, tableTop);
      doc.text("Revenue", colX.rev, tableTop);
      doc.text("Tax", colX.tax, tableTop);
      doc.text("Success", colX.status, tableTop);

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Table Rows
      let y = tableTop + 25;
      doc.font("Helvetica");

      reports.forEach((report) => {
        // Add new page if we run out of space
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        doc.text(new Date(report.date).toLocaleDateString(), colX.date, y);
        doc.text(report.metrics.totalOrders.toString(), colX.orders, y);
        doc.text(report.metrics.totalRevenue.toFixed(2), colX.rev, y);
        doc.text(report.metrics.totalTaxCollected.toFixed(2), colX.tax, y);
        doc.text(report.metrics.successfulOrders.toString(), colX.status, y);

        y += 20;
      });

      // Final Totals Logic (Optional)
      const totalRev = reports.reduce(
        (acc, curr) => acc + curr.metrics.totalRevenue,
        0
      );
      doc.moveDown();
      doc
        .font("Helvetica-Bold")
        .text(`Total Revenue in Range: ${totalRev.toFixed(2)}`, 50, y + 20);

      doc.end();

      const pdfBuffer = await pdfBufferPromise;

      return {
        status: 200,
        data: {
          fileType: "application/pdf",
          fileName: `sales_report_${Date.now()}.pdf`,
          // Convert Buffer to Base64 for safe JSON transport
          fileContent: pdfBuffer.toString("base64"),
        },
      };
    }

    return { status: 400, message: "Invalid format. Use 'pdf' or 'csv'." };
  } catch (error) {
    console.error("RPC Download Report Error:", error);
    return { status: 500, message: error.message };
  }
};
