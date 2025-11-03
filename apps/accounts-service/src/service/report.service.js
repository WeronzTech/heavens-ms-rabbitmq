import ChartOfAccount from "../models/chartOfAccounts.model.js";
import JournalEntry from "../models/journalEntry.model.js";

/**
 * Generates a Profit & Loss (Income Statement) report for a given period.
 */
export const getProfitAndLossReport = async (filters) => {
  const { propertyId, startDate, endDate } = filters;

  const dateMatch = {};
  if (startDate) dateMatch.$gte = new Date(startDate);
  if (endDate) dateMatch.$lte = new Date(endDate);

  const matchConditions = {
    date: dateMatch,
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
    date: dateMatch,
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
