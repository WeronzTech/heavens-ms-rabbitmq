import Order from "../models/orders.model.js";
import DailySalesReport from "../models/dailySalesReport.model.js";

export const generateDailyReport = async () => {
  try {
    // 1. Calculate the Time Range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(today);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const yesterdayEnd = new Date(today);
    yesterdayEnd.setMilliseconds(-1);

    console.log(`Generating report for: ${yesterdayStart.toDateString()}`);

    // 2. Run Aggregation on Orders
    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },

          // --- EXISTING LOGIC ---
          successfulOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0],
            },
          },

          // --- NEW LOGIC: Payment Method Counts ---
          onlineOrdersCount: {
            $sum: {
              // Check if paymentMethod is 'Online'
              $cond: [{ $eq: ["$paymentMethod", "Online"] }, 1, 0],
            },
          },
          codOrdersCount: {
            $sum: {
              // Check if paymentMethod is 'COD' (or 'Cash')
              // Ensure this string matches exactly what you store in your DB
              $cond: [{ $eq: ["$paymentMethod", "COD"] }, 1, 0],
            },
          },

          // --- FINANCIALS ---
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "Completed"] },
                "$bill.grandTotal",
                0,
              ],
            },
          },
          totalDiscount: { $sum: "$bill.discount" },
          totalTax: { $sum: "$bill.tax" },
        },
      },
    ]);

    // 3. Prepare Data
    const result = stats[0] || {
      totalOrders: 0,
      successfulOrders: 0,
      cancelledOrders: 0,
      onlineOrdersCount: 0, // Default 0
      codOrdersCount: 0, // Default 0
      totalRevenue: 0,
      totalDiscount: 0,
      totalTax: 0,
    };

    // 4. Save to DB
    const report = await DailySalesReport.findOneAndUpdate(
      { date: yesterdayStart },
      {
        date: yesterdayStart,
        metrics: {
          totalOrders: result.totalOrders,
          successfulOrders: result.successfulOrders,
          cancelledOrders: result.cancelledOrders,
          totalRevenue: result.totalRevenue,
          totalDiscountGiven: result.totalDiscount,
          totalTaxCollected: result.totalTax,
        },
        // Add the breakdown here
        paymentBreakdown: {
          online: result.onlineOrdersCount,
          cod: result.codOrdersCount,
        },
      },
      { upsert: true, new: true }
    );

    console.log("Daily Sales Report Created Successfully:", report._id);
  } catch (error) {
    console.error("Error generating daily report:", error);
  }
};
