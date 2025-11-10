// ⭐️ --- START UPDATE ---
// This is a NEW FILE for Bank Reconciliation (BRS).
import JournalEntry from "../models/journalEntry.model.js";
import ChartOfAccount from "../models/chartOfAccounts.model.js";
import mongoose from "mongoose";

/**
 * Gets all unreconciled bank transactions for a specific bank account.
 * @param {object} filters - { accountId, endDate, propertyId }
 */
export const getUnreconciledEntries = async (filters) => {
  const { accountId, endDate, propertyId } = filters;

  if (!accountId) {
    return {
      success: false,
      status: 400,
      message: "Bank Account ID is required.",
    };
  }

  // Verify it's a bank account
  const account = await ChartOfAccount.findById(accountId).lean();
  if (
    !account ||
    (!account.name.toLowerCase().includes("bank") &&
      !account.name.toLowerCase().includes("cash"))
  ) {
    return {
      success: false,
      status: 400,
      message: "Invalid account. Must be a Bank or Cash Account.",
    };
  }

  const match = {
    "transactions.accountId": new mongoose.Types.ObjectId(accountId),
    "bankReconciliation.isReconciled": false,
    ...(propertyId && { propertyId: new mongoose.Types.ObjectId(propertyId) }),
    ...(endDate && { date: { $lte: new Date(endDate) } }),
  };

  try {
    const entries = await JournalEntry.find(match)
      .populate("transactions.accountId", "name")
      .sort({ date: 1 })
      .lean();

    const processedEntries = entries.map((entry) => {
      const thisLeg = entry.transactions.find((t) =>
        t.accountId._id.equals(accountId)
      );
      return {
        _id: entry._id,
        date: entry.date,
        description: entry.description,
        referenceType: entry.referenceType,
        debit: thisLeg.debit,
        credit: thisLeg.credit,
      };
    });

    return { success: true, status: 200, data: processedEntries };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

/**
 * Reconciles a list of journal entries with a given bank date.
 * @param {object} data - { entryIds: string[], bankDate: Date }
 */
export const reconcileEntries = async (data) => {
  const { entryIds, bankDate } = data;

  if (!Array.isArray(entryIds) || entryIds.length === 0 || !bankDate) {
    return {
      success: false,
      status: 400,
      message: "entryIds array and bankDate are required.",
    };
  }

  try {
    const result = await JournalEntry.updateMany(
      { _id: { $in: entryIds } },
      {
        $set: {
          "bankReconciliation.isReconciled": true,
          "bankReconciliation.bankDate": new Date(bankDate),
        },
      }
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        status: 404,
        message: "No matching entries found to reconcile.",
      };
    }

    return {
      success: true,
      status: 200,
      message: `Successfully reconciled ${result.modifiedCount} entries.`,
      data: result,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};
// ⭐️ --- END UPDATE ---
