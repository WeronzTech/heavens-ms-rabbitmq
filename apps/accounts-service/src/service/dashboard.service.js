import mongoose from "mongoose";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import Payments from "../models/feePayments.model.js";
import Expense from "../models/expense.model.js";

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
      paymentDate: {
        $gte: lastMonthStart,
        $lte: currentMonthTillToday,
      },
    };

    if (propertyId) {
      matchCondition["property.id"] = new mongoose.Types.ObjectId(propertyId);
    }

    // Aggregation for payment statistics
    const paymentStats = await Expense.aggregate([
      {
        $match: matchCondition,
      },
      {
        $project: {
          amount: 1,
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
          _id: null,
          currentMonthReceived: {
            $sum: { $cond: ["$isCurrentMonth", "$amount", 0] },
          },
          lastMonthReceived: {
            $sum: { $cond: ["$isLastMonth", "$amount", 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          currentMonthReceived: 1,
          lastMonthReceived: 1,
        },
      },
    ]);

    return {
      success: true,
      status: 200,
      message: "Financial dashboard data retrieved successfully",
      data: paymentStats,
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
