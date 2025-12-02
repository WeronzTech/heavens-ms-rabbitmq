import mongoose from "mongoose";

const dailySalesReportSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true, // Ensures only one report per day
    },
    metrics: {
      totalOrders: { type: Number, default: 0 },
      successfulOrders: { type: Number, default: 0 }, // Status: Completed
      cancelledOrders: { type: Number, default: 0 },

      totalRevenue: { type: Number, default: 0 }, // Money actually received
      totalDiscountGiven: { type: Number, default: 0 },
      totalTaxCollected: { type: Number, default: 0 },
    },
    // Optional: Breakdown by payment method
    paymentBreakdown: {
      online: { type: Number, default: 0 },
      cod: { type: Number, default: 0 }, // If you add COD later
    },
  },
  { timestamps: true }
);

const DailySalesReport = mongoose.model(
  "DailySalesReport",
  dailySalesReportSchema
);

export default DailySalesReport;
