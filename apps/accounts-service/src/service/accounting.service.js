import mongoose from "mongoose";
import JournalEntry from "../models/journalEntry.model.js";
import ChartOfAccount from "../models/chartOfAccounts.model.js";

/**
 * Creates a balanced, double-entry journal transaction.
 * This function is designed to be called from within other services (e.g., feePayment, expense).
 *
 * @param {object} entryData - The data for the journal entry.
 * @param {Date} entryData.date - The date of the transaction.
 * @param {string} entryData.description - A description for the journal entry (e.g., "Rent received from John Doe").
 * @param {string} entryData.propertyId - The ID of the property this transaction relates to.
 * @param {string} [entryData.kitchenId] - The ID of the kitchen (if relevant).
 * @param {string} entryData.referenceId - The _id of the source document (e.g., Payment ID, Expense ID).
 * @param {string} entryData.referenceType - The model name of the source (e.g., "FeePayment", "Expense").
 * @param {Array<object>} entryData.transactions - An array of transaction objects.
 * @param {string} entryData.transactions[].accountName - The exact name of the account from ChartOfAccount (e.g., "Bank Account", "Rent Income").
 * @param {number} [entryData.transactions[].debit] - The debit amount.
 * @param {number} [entryData.transactions[].credit] - The credit amount.
 * @param {object} [options] - Mongoose session options.
 * @param {mongoose.ClientSession} [options.session] - The Mongoose session to use for an atomic transaction.
 */
export const createJournalEntry = async (entryData, options = {}) => {
  const {
    date,
    description,
    propertyId,
    kitchenId,
    referenceId,
    referenceType,
    transactions,
    performedBy,
  } = entryData;

  if (
    !date ||
    !description ||
    !referenceId ||
    !referenceType ||
    !Array.isArray(transactions) ||
    transactions.length < 2
  ) {
    throw new Error("Invalid journal entry data. Missing required fields.");
  }

  let totalDebits = 0;
  let totalCredits = 0;
  const processedTransactions = [];

  // 1. Find account IDs and validate amounts
  for (const trans of transactions) {
    const { accountName, debit = 0, credit = 0 } = trans;

    if (!accountName || (debit === 0 && credit === 0)) {
      throw new Error(
        `Invalid transaction for account: ${accountName}. Must have accountName and non-zero debit/credit.`
      );
    }

    // Use findOne to be able to use session
    const account = await ChartOfAccount.findOne({ name: accountName })
      .select("_id accountType balance")
      .session(options.session || null);
    if (!account) {
      throw new Error(
        `Accounting error: ChartOfAccount entry named "${accountName}" not found.`
      );
    }

    processedTransactions.push({
      accountId: account._id,
      debit,
      credit,
    });

    totalDebits += debit;
    totalCredits += credit;

    // 2. Update account balances
    let balanceChange = 0;
    if (["Asset", "Expense"].includes(account.accountType)) {
      balanceChange = debit - credit;
    } else {
      balanceChange = credit - debit;
    }

    await ChartOfAccount.updateOne(
      { _id: account._id },
      { $inc: { balance: balanceChange } },
      { session: options.session || null }
    );
  }

  // 3. Verify that the entry is balanced
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    // Tolerance for floating point
    throw new Error(
      `Journal entry is unbalanced. Debits (${totalDebits}) != Credits (${totalCredits}).`
    );
  }

  // 4. Create the Journal Entry document
  const journalEntry = new JournalEntry({
    date,
    description,
    propertyId,
    kitchenId,
    referenceId,
    referenceType,
    transactions: processedTransactions,
    performedBy: performedBy || "System", // Or get from session/user context if available
  });

  await journalEntry.save({ session: options.session || null });

  console.log(
    `[Accounting] Journal Entry ${journalEntry._id} created for ${referenceType} ${referenceId}.`
  );
};

/**
 * Creates a MANUAL journal entry (e.g., from an admin panel).
 * This is a standalone transaction.
 *
 * @param {object} data - The data for the journal entry.
 * @param {Date} data.date - The date of the transaction.
 * @param {string} data.description - A description for the journal entry.
 * @param {string} data.propertyId - The ID of the property.
 * @param {Array<object>} data.transactions - Array of transactions.
 * @param {string} data.transactions[].accountId - The _id of the ChartOfAccount.
 * @param {number} [data.transactions[].debit] - The debit amount.
 * @param {number} [data.transactions[].credit] - The credit amount.
 * @param {string} data.performedBy - The name or ID of the admin creating the entry.
 */
export const createManualJournalEntry = async (data) => {
  const { date, description, propertyId, transactions, performedBy } = data;

  if (
    !date ||
    !description ||
    !propertyId ||
    !Array.isArray(transactions) ||
    transactions.length < 2 ||
    !performedBy
  ) {
    return {
      success: false,
      status: 400,
      message: "Missing required fields for manual entry.",
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let totalDebits = 0;
    let totalCredits = 0;
    const processedTransactions = [];

    for (const trans of transactions) {
      const { accountId, debit = 0, credit = 0 } = trans;
      if (!accountId || (debit === 0 && credit === 0)) {
        throw new Error(
          "Invalid transaction. 'accountId' and a non-zero debit/credit are required."
        );
      }

      const account = await ChartOfAccount.findById(accountId).session(session);
      if (!account) {
        throw new Error(`Account with ID "${accountId}" not found.`);
      }

      processedTransactions.push({ accountId, debit, credit });
      totalDebits += debit;
      totalCredits += credit;

      // Update account balance
      let balanceChange = 0;
      if (["Asset", "Expense"].includes(account.accountType)) {
        balanceChange = debit - credit;
      } else {
        balanceChange = credit - debit;
      }
      account.balance += balanceChange;
      await account.save({ session });
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `Journal entry is unbalanced. Debits (${totalDebits}) != Credits (${totalCredits}).`
      );
    }

    // Create the Journal Entry
    const manualEntry = new JournalEntry({
      date,
      description,
      propertyId,
      transactions: processedTransactions,
      performedBy,
      referenceId: new mongoose.Types.ObjectId(), // A new ID just for reference
      referenceType: "Manual Entry",
    });

    await manualEntry.save({ session });

    await session.commitTransaction();
    return {
      success: true,
      status: 201,
      data: manualEntry,
      message: "Manual journal entry created successfully.",
    };
  } catch (error) {
    await session.abortTransaction();
    return { success: false, status: 400, message: error.message };
  } finally {
    session.endSession();
  }
};
