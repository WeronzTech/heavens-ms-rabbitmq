import mongoose from "mongoose";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import Payments from "../models/feePayments.model.js";
import Expense from "../models/expense.model.js";
import StaffSalaryHistory from "../models/staffSalaryHistory.model.js";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import fs from "fs";
import path from "path";


export const getAccountDashboardDataForIncomeSection = async (data) => {
  try {
    const { propertyId } = data;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const currentMonthTillToday = new Date(
      currentYear,
      currentMonth - 1,
      currentDay,
      23,
      59,
      59,
      999
    );
    const lastMonthStart = new Date(
      lastMonthYear,
      lastMonth - 1,
      1,
      0,
      0,
      0,
      0
    );
    const lastMonthEnd = new Date(lastMonthYear, lastMonth, 0, 23, 59, 59, 999);

    const matchCondition = {
      paymentDate: {
        $gte: lastMonthStart,
        $lte: currentMonthTillToday,
      },
    };

    if (propertyId) {
      matchCondition["property.id"] = new mongoose.Types.ObjectId(propertyId);
    }

    // Aggregation for payment statistics
    const paymentStats = await Payments.aggregate([
      {
        $match: matchCondition,
      },
      {
        $project: {
          amount: 1,
          paymentDate: 1,
          rentType: 1,
          isCurrentMonth: {
            $and: [
              { $gte: ["$paymentDate", currentMonthStart] },
              { $lte: ["$paymentDate", currentMonthTillToday] },
            ],
          },
          isLastMonth: {
            $and: [
              { $gte: ["$paymentDate", lastMonthStart] },
              { $lte: ["$paymentDate", lastMonthEnd] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$rentType",
          currentMonthReceived: {
            $sum: {
              $cond: ["$isCurrentMonth", "$amount", 0],
            },
          },
          lastMonthReceived: {
            $sum: {
              $cond: ["$isLastMonth", "$amount", 0],
            },
          },
        },
      },
    ]);

    const userResponse = await sendRPCRequest(
      USER_PATTERN.DASHBOARD.GET_USER_STATISTICS_FOR_ACCOUNTS_DASHBOARD,
      { propertyId }
    );

    if (!userResponse.success) {
      return {
        success: false,
        status: 404,
        message: "User stats not found for this property.",
      };
    }

    const userStats = userResponse.data;
    const rentTypes = ["monthly", "daily", "mess"];
    const result = {};

    rentTypes.forEach((rentType) => {
      const paymentStat = paymentStats.find(
        (stat) => stat._id === rentType
      ) || {
        currentMonthReceived: 0,
        lastMonthReceived: 0,
      };

      const userStat = userStats.find((stat) => stat._id === rentType) || {
        totalMonthlyRent: 0,
        totalMessAmount: 0,
        totalDailyAmount: 0,
        userCount: 0,
      };

      // Calculate total amount needed based on rent type
      let totalAmountNeed = 0;
      if (rentType === "monthly") {
        totalAmountNeed = userStat.totalMonthlyRent;
      } else if (rentType === "mess") {
        totalAmountNeed = userStat.totalMessAmount;
      } else if (rentType === "daily") {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const dailyRate = userStat.totalDailyAmount / daysInMonth;
        totalAmountNeed = dailyRate * currentDay;
      }

      const percentageReceived =
        totalAmountNeed > 0
          ? (paymentStat.currentMonthReceived / totalAmountNeed) * 100
          : 0;

      const rawDifference =
        paymentStat.currentMonthReceived - paymentStat.lastMonthReceived;

      const comparisonAmount = Math.abs(rawDifference);
      let comparisonPercentage = 0;

      if (paymentStat.lastMonthReceived > 0) {
        comparisonPercentage = Math.abs(
          (rawDifference / paymentStat.lastMonthReceived) * 100
        );
      } else if (paymentStat.currentMonthReceived > 0) {
        comparisonPercentage = 100;
      }

      //   const isIncrease = rawDifference >= 0;

      let isIncrease;
      if (rawDifference > 0) {
        isIncrease = "increase"; // increase
      } else if (rawDifference < 0) {
        isIncrease = "decrease"; // decrease
      } else {
        isIncrease = "neutral"; // exactly equal
      }

      result[rentType] = {
        currentMonthReceived: paymentStat.currentMonthReceived,
        lastMonthReceived: paymentStat.lastMonthReceived,
        totalAmountNeed: totalAmountNeed,
        percentageReceived: Math.round(percentageReceived * 100) / 100,
        comparisonPercentage: Math.round(comparisonPercentage * 100) / 100,
        comparisonAmount: comparisonAmount,
        pendingAmount: Math.max(
          0,
          totalAmountNeed - paymentStat.currentMonthReceived
        ),
        isIncrease: isIncrease,
        userCount: userStat.userCount,
      };
    });

    return {
      success: true,
      status: 200,
      message: "Financial dashboard data retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Income Summary Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

// Helper functions (same as above)
function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

export const getAccountDashboardDataForExpenseSection = async (data) => {
  try {
    const { propertyId } = data;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const currentMonthTillToday = new Date(
      currentYear,
      currentMonth - 1,
      currentDay,
      23,
      59,
      59,
      999
    );
    const lastMonthStart = new Date(
      lastMonthYear,
      lastMonth - 1,
      1,
      0,
      0,
      0,
      0
    );
    const lastMonthEnd = new Date(lastMonthYear, lastMonth, 0, 23, 59, 59, 999);

    const matchCondition = {
      date: {
        $gte: lastMonthStart,
        $lte: currentMonthTillToday,
      },
    };

    if (propertyId) {
      matchCondition["property.id"] = new mongoose.Types.ObjectId(propertyId);
    }

    const expenseStats = await Expense.aggregate([
      { $match: matchCondition },
      {
        $project: {
          amount: 1,
          type: 1,
          date: 1,
          isCurrentMonth: {
            $and: [
              { $gte: ["$date", currentMonthStart] },
              { $lte: ["$date", currentMonthTillToday] },
            ],
          },
          isLastMonth: {
            $and: [
              { $gte: ["$date", lastMonthStart] },
              { $lte: ["$date", lastMonthEnd] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$type",
          currentMonthExpense: {
            $sum: { $cond: ["$isCurrentMonth", "$amount", 0] },
          },
          lastMonthExpense: {
            $sum: { $cond: ["$isLastMonth", "$amount", 0] },
          },
        },
      },
    ]);

    // ✅ Initialize totals and always include pg, mess, others
    const result = {
      currentMonthExpense: 0,
      lastMonthExpense: 0,
      currentMonthPgExpense: 0,
      lastMonthPgExpense: 0,
      currentMonthMessExpense: 0,
      lastMonthMessExpense: 0,
      currentMonthOthersExpense: 0,
      lastMonthOthersExpense: 0,
    };

    // Fill dynamic fields per type
    expenseStats.forEach((item) => {
      result.currentMonthExpense += item.currentMonthExpense;
      result.lastMonthExpense += item.lastMonthExpense;

      const typeKey = item._id?.toLowerCase();
      if (typeKey === "pg") {
        result.currentMonthPgExpense = item.currentMonthExpense;
        result.lastMonthPgExpense = item.lastMonthExpense;
      } else if (typeKey === "mess") {
        result.currentMonthMessExpense = item.currentMonthExpense;
        result.lastMonthMessExpense = item.lastMonthExpense;
      } else {
        result.currentMonthOthersExpense = item.currentMonthExpense;
        result.lastMonthOthersExpense = item.lastMonthExpense;
      }
    });

    // Compute totals difference and percentage
    const rawDifference = result.currentMonthExpense - result.lastMonthExpense;
    const difference = Math.abs(rawDifference);

    let percentageChange = 0;
    if (result.lastMonthExpense !== 0) {
      percentageChange = Math.abs(
        (rawDifference / result.lastMonthExpense) * 100
      );
    }

    let trend = "neutral";
    if (rawDifference > 0) trend = "increased";
    else if (rawDifference < 0) trend = "decreased";

    return {
      success: true,
      status: 200,
      message: "Financial dashboard data retrieved successfully",
      data: {
        ...result,
        difference,
        percentageChange: Number(percentageChange.toFixed(2)),
        trend,
      },
    };
  } catch (error) {
    console.error("Expense Summary Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};


/**
 * Get GST report data and optionally export as Excel or PDF
 * @param {Object} options - Options for export
 * @param {string} options.format - 'excel' | 'pdf' | undefined
 * @returns {Object} - GST report data and optionally file path
 */
export const getGSTReport = async ({ format } = {}) => {
  try {
    // Ensure "downloads" folder exists
    const downloadDir = path.join(process.cwd(), "downloads");
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

    // 1️⃣ Fetch all data in parallel
    const [feePayments, expenses, salaries] = await Promise.all([
      Payments.find({}),
      Expense.find({}),
      StaffSalaryHistory.find({}),
    ]);

    // 2️⃣ Convert salaries to expense-like objects
    const salaryAsExpense = salaries.map((sal) => ({
      title: `Salary - ${sal.employeeType}`,
      category: "Salary",
      paymentMethod: "N/A",
      amount: sal.salary || 0,
      date: sal.date,
      property: sal.property || {},
    }));

    // 3️⃣ Merge actual expenses + salaries
    const allExpenses = [...expenses, ...salaryAsExpense];

    // 4️⃣ Totals
    const totalIncome = feePayments.reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalExpense = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalIncome - totalExpense;

    // 5️⃣ Structure report data
    const reportData = {
      feePayments,
      allExpenses,
      summary: {
        totalIncome,
        totalExpense,
        netProfit,
        incomeCount: feePayments.length,
        expenseCount: allExpenses.length,
      },
    };

    // 6️⃣ If no export requested, return data only
    if (!format) {
      return {
        success: true,
        status: 200,
        message: "GST report fetched successfully",
        data: reportData,
      };
    }

    // 7️⃣ Prepare file path
    const fileName = `GST_Report_${Date.now()}.${format === "pdf" ? "pdf" : "xlsx"}`;
    const filePath = path.join(downloadDir, fileName);

    // 8️⃣ Export as Excel
    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("GST Report");

      // Summary Section
      sheet.addRow(["GST REPORT SUMMARY"]);
      sheet.addRow(["Total Income", reportData.summary.totalIncome]);
      sheet.addRow(["Total Expense", reportData.summary.totalExpense]);
      sheet.addRow(["Net Profit", reportData.summary.netProfit]);
      sheet.addRow([]);

      // Fee Payments
      sheet.addRow(["FEE PAYMENTS"]);
      sheet.addRow(["Name", "Contact", "Room", "Amount", "Payment Method", "Date"]);
      reportData.feePayments.forEach((f) => {
        sheet.addRow([
          f.name,
          f.contact,
          f.room,
          f.amount,
          f.paymentMethod,
          f.paymentDate ? new Date(f.paymentDate).toISOString().split("T")[0] : "",
        ]);
      });
      sheet.addRow([]);

      // Expenses
      sheet.addRow(["EXPENSES"]);
      sheet.addRow(["Title", "Category", "Payment Method", "Amount", "Date", "Property Name"]);
      reportData.allExpenses.forEach((e) => {
        sheet.addRow([
          e.title,
          e.category,
          e.paymentMethod,
          e.amount,
          e.date ? new Date(e.date).toISOString().split("T")[0] : "",
          e.property?.name || "",
        ]);
      });

      await workbook.xlsx.writeFile(filePath);
    }

    // 9️⃣ Export as PDF (using jsPDF)
    if (format === "pdf") {
      const doc = new jsPDF();
      let y = 20;

      // Title
      doc.setFontSize(18);
      doc.text("GST Report", 80, y);
      y += 10;

      // Summary
      doc.setFontSize(14);
      doc.text("SUMMARY", 20, (y += 10));
      doc.setFontSize(12);
      doc.text(`Total Income: ₹${totalIncome}`, 20, (y += 8));
      doc.text(`Total Expense: ₹${totalExpense}`, 20, (y += 8));
      doc.text(`Net Profit: ₹${netProfit}`, 20, (y += 8));

      // Fee Payments
      y += 12;
      doc.setFontSize(14);
      doc.text("FEE PAYMENTS", 20, (y += 10));
      doc.setFontSize(11);
      reportData.feePayments.forEach((f) => {
        if (y > 280) { // new page if needed
          doc.addPage();
          y = 20;
        }
        doc.text(
          `${f.name || "-"} | ₹${f.amount || 0} | ${f.paymentMethod || "-"} | ${
            f.paymentDate ? new Date(f.paymentDate).toISOString().split("T")[0] : "-"
          }`,
          20,
          (y += 6)
        );
      });

      // Expenses
      y += 12;
      doc.setFontSize(14);
      doc.text("EXPENSES", 20, (y += 10));
      doc.setFontSize(11);
      reportData.allExpenses.forEach((e) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(
          `${e.title || "-"} | ₹${e.amount || 0} | ${e.paymentMethod || "-"} | ${
            e.date ? new Date(e.date).toISOString().split("T")[0] : "-"
          } | ${e.property?.name || "-"}`,
          20,
          (y += 6)
        );
      });

      // Save PDF to file
      const pdfData = doc.output();
      fs.writeFileSync(filePath, Buffer.from(pdfData, "binary"));
    }

    return {
      success: true,
      status: 200,
      message: "GST report exported successfully",
      data: reportData,
      filePath,
    };
  } catch (error) {
    console.error("Error in getGSTReport:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to fetch/export GST report",
      error: error.message,
    };
  }
};