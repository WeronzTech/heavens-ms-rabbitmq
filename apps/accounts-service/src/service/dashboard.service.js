import mongoose from "mongoose";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import Payments from "../models/feePayments.model.js";
import Expense from "../models/expense.model.js";
import Deposits from "../models/depositPayments.model.js";
import StaffSalaryHistory from "../models/staffSalaryHistory.model.js";

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
      let totalPendingAmount = 0;
      if (rentType === "monthly") {
        totalAmountNeed = userStat.totalMonthlyRent;
        totalPendingAmount = userStat.totalPendingAmount;
      } else if (rentType === "mess") {
        totalAmountNeed = userStat.totalMessAmount;
        totalPendingAmount = userStat.totalPendingAmount;
      } else if (rentType === "daily") {
        // const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        // const dailyRate = userStat.totalDailyAmount / daysInMonth;
        // totalAmountNeed = dailyRate * currentDay;
        totalAmountNeed = userStat.totalDailyAmount;
        totalPendingAmount = userStat.totalPendingAmount;
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
        pendingAmount: totalPendingAmount,
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

export const getAccountDashboardDataForDepositSection = async (data) => {
  try {
    const { propertyId } = data;

    // 🧩 Base filter (for deposits collection)
    const filter = { isRefund: false };
    if (propertyId) {
      filter.property = new mongoose.Types.ObjectId(propertyId);
    }

    // 🗓️ Date range for current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // 💰 Total deposits received (this month)
    const monthlyDeposits = await Deposits.aggregate([
      {
        $match: {
          ...filter,
          paymentDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountPaid" },
        },
      },
    ]);

    const totalReceivedThisMonth =
      monthlyDeposits.length > 0 ? monthlyDeposits[0].totalAmount : 0;

    // 👥 Fetch user-related deposit statistics via RPC
    const userResponse = await sendRPCRequest(
      USER_PATTERN.DASHBOARD.GET_USER_DEPOSIT_STATISTICS_FOR_ACCOUNTS_DASHBOARD,
      { propertyId }
    );

    if (!userResponse.success) {
      return {
        success: false,
        status: 404,
        message: "User stats not found for this property.",
      };
    }

    const userStats = userResponse?.data || {};

    // 🧮 Combine both deposit and user stats data
    const combinedData = {
      currentMonthNonRefundable: userStats.currentMonthNonRefundable || 0,
      currentMonthRefundable: userStats.currentMonthRefundable || 0,
      currentMonthPending: userStats.currentMonthPending || 0,
      noOfCurrentMonthJoines: userStats.noOfCurrentMonthJoines || 0,
      totalReceivedThisMonth,
    };

    // ✅ Final Response
    return {
      success: true,
      status: 200,
      message: propertyId
        ? "Deposit dashboard data fetched successfully for property"
        : "Deposit dashboard data fetched successfully for all properties",
      data: combinedData,
    };
  } catch (error) {
    console.error("Error in getAccountDashboardDataForDepositSection:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error while fetching deposit dashboard data",
      error: error.message,
    };
  }
};

export const getMonthlyIncomeExpenseSummaryForMainDashboard = async (data) => {
  try {
    const { propertyId, year } = data;
    const selectedYear = year || new Date().getFullYear();

    const propertyMatch = propertyId
      ? { "property.id": new mongoose.Types.ObjectId(propertyId) }
      : {};

    // -------------------------------------
    // 🔹 STEP 1: Get available years from all collections
    // -------------------------------------
    const getYears = async (Model, dateField) => {
      const years = await Model.aggregate([
        { $match: propertyMatch },
        {
          $project: {
            year: { $year: `$${dateField}` },
          },
        },
        { $group: { _id: null, years: { $addToSet: "$year" } } },
      ]);
      return years[0]?.years || [];
    };

    const [paymentYears, depositYears, expenseYears, salaryYears] =
      await Promise.all([
        getYears(Payments, "paymentDate"),
        getYears(Deposits, "paymentDate"),
        getYears(Expense, "date"),
        getYears(StaffSalaryHistory, "date"),
      ]);

    // Merge and sort years
    const availableYears = Array.from(
      new Set([
        ...paymentYears,
        ...depositYears,
        ...expenseYears,
        ...salaryYears,
      ])
    ).sort((a, b) => b - a); // descending order

    // -------------------------------------
    // 🔹 STEP 2: Aggregate month-wise data for selected year
    // -------------------------------------
    const incomeMatch = {
      ...propertyMatch,
      paymentDate: {
        $gte: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
        $lte: new Date(`${selectedYear}-12-31T23:59:59.999Z`),
      },
    };

    const paymentIncome = await Payments.aggregate([
      { $match: incomeMatch },
      {
        $project: {
          amount: 1,
          month: { $month: "$paymentDate" },
          year: { $year: "$paymentDate" },
        },
      },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          totalIncome: { $sum: "$amount" },
        },
      },
    ]);

    const depositIncome = await Deposits.aggregate([
      { $match: incomeMatch },
      {
        $project: {
          amount: 1,
          month: { $month: "$paymentDate" },
          year: { $year: "$paymentDate" },
        },
      },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          totalIncome: { $sum: "$amount" },
        },
      },
    ]);

    const combinedIncome = {};
    [...paymentIncome, ...depositIncome].forEach((entry) => {
      const key = `${entry._id.month}-${entry._id.year}`;
      combinedIncome[key] =
        (combinedIncome[key] || 0) + (entry.totalIncome || 0);
    });

    const expenseMatch = {
      ...propertyMatch,
      date: {
        $gte: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
        $lte: new Date(`${selectedYear}-12-31T23:59:59.999Z`),
      },
    };

    const expenseData = await Expense.aggregate([
      { $match: expenseMatch },
      {
        $project: {
          amount: 1,
          month: { $month: "$date" },
          year: { $year: "$date" },
        },
      },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          totalExpense: { $sum: "$amount" },
        },
      },
    ]);

    const staffSalaryData = await StaffSalaryHistory.aggregate([
      { $match: expenseMatch },
      {
        $project: {
          amount: 1,
          month: { $month: "$date" },
          year: { $year: "$date" },
        },
      },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          totalExpense: { $sum: "$amount" },
        },
      },
    ]);

    const combinedExpense = {};
    [...expenseData, ...staffSalaryData].forEach((entry) => {
      const key = `${entry._id.month}-${entry._id.year}`;
      combinedExpense[key] =
        (combinedExpense[key] || 0) + (entry.totalExpense || 0);
    });

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const result = [];

    for (let month = 1; month <= 12; month++) {
      const key = `${month}-${selectedYear}`;
      const totalIncome = combinedIncome[key] || 0;
      const totalExpense = combinedExpense[key] || 0;

      if (totalIncome > 0 || totalExpense > 0) {
        result.push({
          monthYear: `${months[month - 1]} ${selectedYear}`,
          totalIncome,
          totalExpense,
        });
      }
    }

    // -------------------------------------
    // 🔹 FINAL RESPONSE
    // -------------------------------------
    return {
      success: true,
      year: selectedYear,
      availableYears,
      data: result,
    };
  } catch (error) {
    console.error("Dashboard Income/Expense Summary Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
