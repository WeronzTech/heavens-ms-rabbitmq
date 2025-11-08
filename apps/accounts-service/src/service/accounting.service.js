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

// export const createJournalEntry = async (entryData, options = {}) => {
//   try {
//     const {
//       date,
//       description,
//       propertyId,
//       kitchenId,
//       referenceId,
//       referenceType,
//       transactions,
//       performedBy,
//     } = entryData;

//     if (
//       !date ||
//       !description ||
//       !referenceId ||
//       !referenceType ||
//       !Array.isArray(transactions) ||
//       transactions.length < 2
//     ) {
//       throw new Error("Invalid journal entry data. Missing required fields.");
//     }

//     let totalDebits = 0;
//     let totalCredits = 0;
//     const processedTransactions = [];

//     // 1. Find account IDs and validate amounts
//     for (const trans of transactions) {
//       const { accountName, debit = 0, credit = 0 } = trans;

//       if (!accountName || (debit === 0 && credit === 0)) {
//         throw new Error(
//           `Invalid transaction for account: ${accountName}. Must have accountName and non-zero debit/credit.`
//         );
//       }

//       // Use findOne to be able to use session
//       const account = await ChartOfAccount.findOne({ name: accountName })
//         .select("_id accountType balance")
//         .session(options.session || null);
//       if (!account) {
//         throw new Error(
//           `Accounting error: ChartOfAccount entry named "${accountName}" not found.`
//         );
//       }

//       processedTransactions.push({
//         accountId: account._id,
//         debit,
//         credit,
//       });

//       totalDebits += debit;
//       totalCredits += credit;

//       // 2. Update account balances
//       let balanceChange = 0;
//       if (["Asset", "Expense"].includes(account.accountType)) {
//         balanceChange = debit - credit;
//       } else {
//         balanceChange = credit - debit;
//       }

//       await ChartOfAccount.updateOne(
//         { _id: account._id },
//         { $inc: { balance: balanceChange } },
//         { session: options.session || null }
//       );
//     }

//     // 3. Verify that the entry is balanced
//     if (Math.abs(totalDebits - totalCredits) > 0.01) {
//       // Tolerance for floating point
//       throw new Error(
//         `Journal entry is unbalanced. Debits (${totalDebits}) != Credits (${totalCredits}).`
//       );
//     }

//     // 4. Create the Journal Entry document
//     const journalEntry = new JournalEntry({
//       date,
//       description,
//       propertyId,
//       kitchenId,
//       referenceId,
//       referenceType,
//       transactions: processedTransactions,
//       performedBy: performedBy || "System", // Or get from session/user context if available
//     });

//     await journalEntry.save({ session: options.session || null });

//     console.log(
//       `[Accounting] Journal Entry ${journalEntry._id} created for ${referenceType} ${referenceId}.`
//     );
//   } catch (err) {
//     console.log("expenseeeeee", err);
//   }
// };

export const createJournalEntry = async (entryData, options = {}) => {
  try {
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

    // 🔒 Basic validation
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

    // 1️⃣ Process each transaction
    for (const trans of transactions) {
      const { accountName, debit = 0, credit = 0 } = trans;

      if (!accountName || (debit === 0 && credit === 0)) {
        throw new Error(
          `Invalid transaction for account: ${accountName}. Must have accountName and non-zero debit/credit.`
        );
      }

      // 🔍 Find the account
      const account = await ChartOfAccount.findOne({ name: accountName })
        .select("_id accountType balance")
        .session(options.session || null);

      if (!account) {
        throw new Error(
          `Accounting error: ChartOfAccount entry named "${accountName}" not found.`
        );
      }

      // 💰 Compute balance change based on account type
      let balanceChange = 0;
      if (["Asset", "Expense"].includes(account.accountType)) {
        balanceChange = debit - credit; // Increases with debit
      } else {
        balanceChange = credit - debit; // Increases with credit
      }

      // 📊 Compute updated balance (after transaction)
      const updatedBalance = account.balance + balanceChange;

      // 💾 Update account balance in DB
      await ChartOfAccount.updateOne(
        { _id: account._id },
        { $set: { balance: updatedBalance } },
        { session: options.session || null }
      );

      // 🧾 Save transaction with *after-transaction* balance
      processedTransactions.push({
        accountId: account._id,
        debit,
        credit,
        balance: updatedBalance, // after transaction ✅
      });

      totalDebits += debit;
      totalCredits += credit;
    }

    // 2️⃣ Verify entry is balanced (Debits = Credits)
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `Journal entry is unbalanced. Debits (${totalDebits}) != Credits (${totalCredits}).`
      );
    }

    // 3️⃣ Create the Journal Entry document
    const journalEntry = new JournalEntry({
      date,
      description,
      propertyId,
      kitchenId,
      referenceId,
      referenceType,
      transactions: processedTransactions,
      performedBy: performedBy || "System",
    });

    await journalEntry.save({ session: options.session || null });

    console.log(
      `[Accounting] ✅ Journal Entry ${journalEntry._id} created for ${referenceType} ${referenceId}.`
    );

    return {
      success: true,
      status: 201,
      data: journalEntry,
      message: "Journal entry created successfully.",
    };
  } catch (err) {
    console.error("[Accounting Error]", err);
    return {
      success: false,
      status: 500,
      message: err.message || "Error creating journal entry.",
    };
  }
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
  console.log(data);
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
      referenceType: "JournalEntry",
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

// export const getAllJournalEntries = async (data = {}) => {
//   try {
//     const { filters } = data;
//     const query = {};

//     console.log("🧩 Filters received:", filters);

//     // ✅ Property filter
//     if (filters.propertyId && filters.propertyId !== "all") {
//       query.propertyId = new mongoose.Types.ObjectId(filters.propertyId);
//     }

//     // ✅ Date range
//     const dateRange = filters.dateRange || filters["dateRange[]"];
//     if (Array.isArray(dateRange) && dateRange.length === 2) {
//       const [startRaw, endRaw] = dateRange;
//       const start = new Date(startRaw);
//       const end = new Date(endRaw);

//       if (!isNaN(start) && !isNaN(end)) {
//         query.date = { $gte: start, $lte: end };
//       } else {
//         console.warn("⚠️ Invalid date range:", dateRange);
//       }
//     }

//     // ✅ Account filter — use $elemMatch for nested array
//     if (filters.accountId && filters.accountId !== "all") {
//       if (mongoose.Types.ObjectId.isValid(filters.accountId)) {
//         query.transactions = {
//           $elemMatch: {
//             accountId: new mongoose.Types.ObjectId(filters.accountId),
//           },
//         };
//       }
//     }

//     // ✅ Search filter
//     if (filters.search && filters.search.trim() !== "") {
//       query.$or = [
//         { description: { $regex: filters.search, $options: "i" } },
//         {
//           "referenceId.transactionId": {
//             $regex: filters.search,
//             $options: "i",
//           },
//         },
//       ];
//     }

//     console.log("🕵️ Final Mongo Query:", JSON.stringify(query, null, 2));

//     // ✅ Fetch with population
//     const journalEntries = await JournalEntry.find(query)
//       .populate({
//         path: "transactions.accountId",
//         select: "name accountType balance",
//       })
//       .populate({
//         path: "referenceId",
//         select: "name title transactionId paymentMethod paymentType",
//       })
//       .sort({ date: -1 });

//     return {
//       success: true,
//       status: 200,
//       data: journalEntries,
//       message: "Journal entries fetched successfully.",
//     };
//   } catch (error) {
//     console.error("❌ Error fetching journal entries:", error);
//     return {
//       success: false,
//       status: 500,
//       message: error.message,
//     };
//   }
// };

export const getAllJournalEntries = async (data = {}) => {
  try {
    const { filters } = data;
    const query = {};

    console.log("🧩 Filters received:", filters);

    // ✅ Property filter
    if (filters.propertyId && filters.propertyId !== "all") {
      query.propertyId = new mongoose.Types.ObjectId(filters.propertyId);
    }

    // ✅ Date range
    const dateRange = filters.dateRange || filters["dateRange[]"];
    if (Array.isArray(dateRange) && dateRange.length === 2) {
      const [startRaw, endRaw] = dateRange;
      const start = new Date(startRaw);
      const end = new Date(endRaw);

      if (!isNaN(start) && !isNaN(end)) {
        query.date = { $gte: start, $lte: end };
      } else {
        console.warn("⚠️ Invalid date range:", dateRange);
      }
    }

    // ✅ Account filter — use $elemMatch for nested array
    if (filters.accountId && filters.accountId !== "all") {
      if (mongoose.Types.ObjectId.isValid(filters.accountId)) {
        query.transactions = {
          $elemMatch: {
            accountId: new mongoose.Types.ObjectId(filters.accountId),
          },
        };
      }
    }

    // ✅ Search filter
    if (filters.search && filters.search.trim() !== "") {
      query.$or = [
        { description: { $regex: filters.search, $options: "i" } },
        {
          "referenceId.transactionId": {
            $regex: filters.search,
            $options: "i",
          },
        },
      ];
    }

    console.log("🕵️ Final Mongo Query:", JSON.stringify(query, null, 2));

    // ✅ Fetch with population
    const journalEntries = await JournalEntry.find(query)
      .populate({
        path: "transactions.accountId",
        select: "name accountType balance",
      })
      .populate({
        path: "referenceId",
        select: "name title transactionId paymentMethod paymentType",
      })
      .sort({ date: -1 });

    // ✅ Compute totals if accountId is provided
    let totalDebit = 0;
    let totalCredit = 0;
    let balance = 0;

    if (filters.accountId && filters.accountId !== "all") {
      for (const entry of journalEntries) {
        for (const txn of entry.transactions || []) {
          if (txn.accountId?._id?.toString() === filters.accountId.toString()) {
            totalDebit += txn.debit || 0;
            totalCredit += txn.credit || 0;
          }
        }
      }
      balance = Math.abs(totalDebit - totalCredit);
    }

    return {
      success: true,
      status: 200,
      data: journalEntries,
      totals:
        filters.accountId && filters.accountId !== "all"
          ? {
              totalDebit,
              totalCredit,
              balance,
            }
          : null,
      message: "Journal entries fetched successfully.",
    };
  } catch (error) {
    console.error("❌ Error fetching journal entries:", error);
    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }
};
export const getJournalEntryById = async (data) => {
  try {
    console.log(data);
    const { ledgerId } = data;
    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(ledgerId)) {
      return {
        success: false,
        status: 400,
        message: "Invalid journal entry ID.",
      };
    }

    console.log("🔍 Fetching journal entry:", ledgerId);

    // ✅ Fetch and populate
    const journalEntry = await JournalEntry.findById(ledgerId)
      .populate({
        path: "transactions.accountId",
        select: "name accountType balance",
      })
      .populate({
        path: "referenceId",
        select: "name title transactionId paymentMethod paymentType",
      });

    // ✅ Handle not found
    if (!journalEntry) {
      return {
        success: false,
        status: 404,
        message: "Journal entry not found.",
      };
    }

    // ✅ Compute totals for this entry
    let totalDebit = 0;
    let totalCredit = 0;

    for (const txn of journalEntry.transactions || []) {
      totalDebit += txn.debit || 0;
      totalCredit += txn.credit || 0;
    }

    const balance = Math.abs(totalDebit - totalCredit);

    // ✅ Return same response shape as getAllJournalEntries
    return {
      success: true,
      status: 200,
      data: journalEntry,
      totals: {
        totalDebit,
        totalCredit,
        balance,
      },
      message: "Journal entry fetched successfully.",
    };
  } catch (error) {
    console.error("❌ Error fetching journal entry:", error);
    return {
      success: false,
      status: 500,
      message: error.message,
    };
  }
};
