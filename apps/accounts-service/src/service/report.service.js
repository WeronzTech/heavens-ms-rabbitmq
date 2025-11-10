import ChartOfAccount from "../models/chartOfAccounts.model.js";
import JournalEntry from "../models/journalEntry.model.js";
import mongoose from "mongoose";

/**
 * Generates a Profit & Loss (Income Statement) report for a given period.
 */
export const getProfitAndLossReport = async (filters) => {
  const { propertyId, startDate, endDate } = filters;

  const dateMatch = {};
  if (startDate) dateMatch.$gte = new Date(startDate);
  if (endDate) dateMatch.$lte = new Date(endDate);

  const matchConditions = {
    ...(Object.keys(dateMatch).length > 0 && { date: dateMatch }), // Only add date filter if dates are provided
    ...(propertyId && { propertyId: new mongoose.Types.ObjectId(propertyId) }),
  };

  // 1. Get all Income and Expense accounts
  const incomeAccounts = await ChartOfAccount.find({ accountType: "Income" })
    .select("_id name")
    .lean();
  const expenseAccounts = await ChartOfAccount.find({ accountType: "Expense" })
    .select("_id name")
    .lean();

  const incomeAccountIds = incomeAccounts.map((a) => a._id);
  const expenseAccountIds = expenseAccounts.map((a) => a._id);

  // 2. Aggregate transactions for these accounts within the date range
  const results = await JournalEntry.aggregate([
    { $match: matchConditions },
    { $unwind: "$transactions" },
    {
      $match: {
        "transactions.accountId": {
          $in: [...incomeAccountIds, ...expenseAccountIds],
        },
      },
    },
    {
      $group: {
        _id: "$transactions.accountId",
        totalDebit: { $sum: "$transactions.debit" },
        totalCredit: { $sum: "$transactions.credit" },
      },
    },
  ]);

  // 3. Map results back to account names and calculate totals
  let totalIncome = 0;
  let totalExpense = 0;
  const incomeDetails = [];
  const expenseDetails = [];

  for (const account of incomeAccounts) {
    const result = results.find((r) => r._id.equals(account._id));
    // Income = Credits - Debits
    const balance = (result?.totalCredit || 0) - (result?.totalDebit || 0);
    totalIncome += balance;
    incomeDetails.push({ accountName: account.name, total: balance });
  }

  for (const account of expenseAccounts) {
    const result = results.find((r) => r._id.equals(account._id));
    // Expense = Debits - Credits
    const balance = (result?.totalDebit || 0) - (result?.totalCredit || 0);
    totalExpense += balance;
    expenseDetails.push({ accountName: account.name, total: balance });
  }

  const netProfit = totalIncome - totalExpense;

  return {
    success: true,
    status: 200,
    data: {
      report: "Profit & Loss",
      filters,
      totalIncome,
      totalExpense,
      netProfit,
      incomeDetails,
      expenseDetails,
    },
  };
};

/**
 * Generates a Balance Sheet report as of a specific date.
 */
export const getBalanceSheetReport = async (filters) => {
  const { propertyId, asOfDate } = filters;

  const dateMatch = {};
  if (asOfDate) dateMatch.$lte = new Date(asOfDate);

  const matchConditions = {
    ...(Object.keys(dateMatch).length > 0 && { date: dateMatch }), // Only add date filter if date is provided
    ...(propertyId && { propertyId: new mongoose.Types.ObjectId(propertyId) }),
  };

  // 1. Get all Asset, Liability, and Equity accounts
  const assetAccounts = await ChartOfAccount.find({ accountType: "Asset" })
    .select("_id name")
    .lean();
  const liabilityAccounts = await ChartOfAccount.find({
    accountType: "Liability",
  })
    .select("_id name")
    .lean();
  const equityAccounts = await ChartOfAccount.find({ accountType: "Equity" })
    .select("_id name")
    .lean();

  const assetAccountIds = assetAccounts.map((a) => a._id);
  const liabilityAccountIds = liabilityAccounts.map((a) => a._id);
  const equityAccountIds = equityAccounts.map((a) => a._id);

  // 2. Aggregate P&L to get Net Profit (Retained Earnings)
  // This is a simplified P&L calculation up to the asOfDate
  const pnLReport = await getProfitAndLossReport({
    propertyId,
    endDate: asOfDate,
  });
  const netProfit = pnLReport.data.netProfit;

  // 3. Aggregate balances for A, L, E accounts
  const results = await JournalEntry.aggregate([
    { $match: matchConditions },
    { $unwind: "$transactions" },
    {
      $match: {
        "transactions.accountId": {
          $in: [
            ...assetAccountIds,
            ...liabilityAccountIds,
            ...equityAccountIds,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$transactions.accountId",
        totalDebit: { $sum: "$transactions.debit" },
        totalCredit: { $sum: "$transactions.credit" },
      },
    },
  ]);

  // 4. Map results and calculate totals
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  const assetDetails = [];
  const liabilityDetails = [];
  const equityDetails = [];

  for (const account of assetAccounts) {
    const result = results.find((r) => r._id.equals(account._id));
    // Asset Balance = Debits - Credits
    const balance = (result?.totalDebit || 0) - (result?.totalCredit || 0);
    totalAssets += balance;
    assetDetails.push({ accountName: account.name, total: balance });
  }

  for (const account of liabilityAccounts) {
    const result = results.find((r) => r._id.equals(account._id));
    // Liability Balance = Credits - Debits
    const balance = (result?.totalCredit || 0) - (result?.totalDebit || 0);
    totalLiabilities += balance;
    liabilityDetails.push({ accountName: account.name, total: balance });
  }

  for (const account of equityAccounts) {
    const result = results.find((r) => r._id.equals(account._id));
    // Equity Balance = Credits - Debits
    const balance = (result?.totalCredit || 0) - (result?.totalDebit || 0);
    totalEquity += balance;
    equityDetails.push({ accountName: account.name, total: balance });
  }

  // Add Net Profit (Retained Earnings) to Equity
  equityDetails.push({
    accountName: "Retained Earnings (Net Profit)",
    total: netProfit,
  });
  totalEquity += netProfit;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    success: true,
    status: 200,
    data: {
      report: "Balance Sheet",
      filters,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
      assetDetails,
      liabilityDetails,
      equityDetails,
    },
  };
};

export const getDayBook = async (filters) => {
  const { propertyId, startDate, endDate } = filters;

  const match = {
    ...(propertyId && { propertyId: new mongoose.Types.ObjectId(propertyId) }),
    ...(startDate && { date: { ...match.date, $gte: new Date(startDate) } }),
    ...(endDate && { date: { ...match.date, $lte: new Date(endDate) } }),
  };

  try {
    const entries = await JournalEntry.find(match)
      .populate("transactions.accountId", "name")
      .sort({ date: 1, createdAt: 1 })
      .lean();

    return {
      success: true,
      status: 200,
      data: entries,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

/**
 * NEW: Gets the Ledger Report (history for a single account).
 */
export const getLedgerReport = async (filters) => {
  const { accountId, propertyId, startDate, endDate } = filters;

  if (!accountId) {
    return { success: false, status: 400, message: "accountId is required." };
  }

  const account = await ChartOfAccount.findById(accountId).lean();
  if (!account) {
    return { success: false, status: 404, message: "Account not found." };
  }

  const propertyMatch = propertyId
    ? { propertyId: new mongoose.Types.ObjectId(propertyId) }
    : {};

  try {
    // 1. Calculate Opening Balance
    const openingBalanceAgg = await JournalEntry.aggregate([
      { $match: { ...propertyMatch, date: { $lt: new Date(startDate) } } },
      { $unwind: "$transactions" },
      {
        $match: {
          "transactions.accountId": new mongoose.Types.ObjectId(accountId),
        },
      },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: "$transactions.debit" },
          totalCredit: { $sum: "$transactions.credit" },
        },
      },
    ]);

    let openingBalance = 0;
    if (openingBalanceAgg.length > 0) {
      const { totalDebit, totalCredit } = openingBalanceAgg[0];
      if (["Asset", "Expense"].includes(account.accountType)) {
        openingBalance = totalDebit - totalCredit;
      } else {
        openingBalance = totalCredit - totalDebit;
      }
    }

    // 2. Get Transactions for the period
    const entries = await JournalEntry.find({
      ...propertyMatch,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      "transactions.accountId": new mongoose.Types.ObjectId(accountId),
    })
      .populate("transactions.accountId", "name") // Populate all account IDs
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // 3. Process transactions to find contra-accounts and running balance
    let runningBalance = openingBalance;
    const transactions = entries.map((entry) => {
      const thisLeg = entry.transactions.find((t) =>
        t.accountId._id.equals(accountId)
      );
      // Find the *other* leg(s) of the transaction
      const contraAccountNames = entry.transactions
        .filter((t) => !t.accountId._id.equals(accountId))
        .map((t) => t.accountId.name) // Already populated
        .join(", "); // Join if multiple

      const debit = thisLeg.debit || 0;
      const credit = thisLeg.credit || 0;

      if (["Asset", "Expense"].includes(account.accountType)) {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }

      return {
        journalEntryId: entry._id,
        date: entry.date,
        description: entry.description,
        referenceType: entry.referenceType,
        contraAccount: contraAccountNames || "Multiple",
        debit,
        credit,
        runningBalance: Number(runningBalance.toFixed(2)),
      };
    });

    return {
      success: true,
      status: 200,
      data: {
        accountName: account.name,
        accountType: account.accountType,
        filters,
        openingBalance: Number(openingBalance.toFixed(2)),
        transactions,
        closingBalance: Number(runningBalance.toFixed(2)),
      },
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

/**
 * NEW: Generates a GSTR-1 (Sales) report.
 */
export const getGSTR1Report = async (filters) => {
  const { propertyId, startDate, endDate } = filters;

  const match = {
    ...(propertyId && { propertyId: new mongoose.Types.ObjectId(propertyId) }),
    date: { $gte: new Date(startDate), $lte: new Date(endDate) },
  };

  try {
    const sales = await JournalEntry.aggregate([
      { $match: match },
      { $unwind: "$transactions" },
      {
        $lookup: {
          from: "chartofaccounts",
          localField: "transactions.accountId",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: "$account" },
      {
        $match: {
          "account.accountType": "Income",
          "account.gstRate": {
            $in: ["Taxable-5", "Taxable-12", "Taxable-18", "Taxable-28"],
          },
        },
      },
      {
        $group: {
          _id: "$account.gstRate",
          taxableAmount: { $sum: "$transactions.credit" }, // Assuming credit = taxable sales amount
        },
      },
      {
        $project: {
          _id: 0,
          gstRate: "$_id",
          taxableAmount: "$taxableAmount",
          cgst: {
            $divide: [
              {
                $multiply: [
                  "$taxableAmount",
                  { $divide: [{ $toDouble: { $substr: ["$_id", 8, 2] } }, 2] },
                ],
              },
              100,
            ],
          },
          sgst: {
            $divide: [
              {
                $multiply: [
                  "$taxableAmount",
                  { $divide: [{ $toDouble: { $substr: ["$_id", 8, 2] } }, 2] },
                ],
              },
              100,
            ],
          },
          igst: 0, // Simplified: Assumes all are Intra-state
        },
      },
    ]);

    return {
      success: true,
      status: 200,
      data: sales,
      message: "GSTR-1 Report (Simplified)",
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};
