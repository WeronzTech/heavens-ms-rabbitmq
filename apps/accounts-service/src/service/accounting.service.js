import mongoose from "mongoose";
import JournalEntry from "../models/journalEntry.model.js";
import ChartOfAccount from "../models/chartOfAccounts.model.js";
import BillLedger from "../models/billLedger.model.js";
import { getAccountId } from "./accountSetting.service.js";
import { ACCOUNT_SYSTEM_NAMES } from "../config/accountMapping.config.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";

// Helper to find GST accounts based on rate and type
const getGstAccountIds = async (rate, isIntraState, isPurchase) => {
  const rateMap = {
    "Taxable-5": {
      cgst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_CGST_2_5
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_CGST_2_5,
      sgst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_SGST_2_5
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_SGST_2_5,
      igst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_IGST_5
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_IGST_5,
    },
    "Taxable-12": {
      cgst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_CGST_6
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_CGST_6,
      sgst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_SGST_6
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_SGST_6,
      igst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_IGST_12
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_IGST_12,
    },
    "Taxable-18": {
      cgst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_CGST_9
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_CGST_9,
      sgst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_SGST_9
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_SGST_9,
      igst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_IGST_18
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_IGST_18,
    },
    "Taxable-28": {
      cgst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_CGST_14
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_CGST_14,
      sgst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_SGST_14
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_SGST_14,
      igst: isPurchase
        ? ACCOUNT_SYSTEM_NAMES.ASSET_GST_INPUT_IGST_28
        : ACCOUNT_SYSTEM_NAMES.LIABILITY_GST_OUTPUT_IGST_28,
    },
  };

  const names = rateMap[rate];
  if (!names) {
    return { cgstId: null, sgstId: null, igstId: null };
  }

  if (isIntraState) {
    return {
      cgstId: await getAccountId(names.cgst),
      sgstId: await getAccountId(names.sgst),
      igstId: null,
    };
  } else {
    return {
      cgstId: null,
      sgstId: null,
      igstId: await getAccountId(names.igst),
    };
  }
};

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
  let hitsBankAccount = false;

  // 1. Find account IDs and validate amounts
  for (const trans of transactions) {
    // const { accountName: systemName, debit = 0, credit = 0 } = trans;
    const { systemName, debit = 0, credit = 0 } = trans;

    if (!systemName || (debit === 0 && credit === 0)) {
      throw new Error(
        `Invalid transaction for account: ${systemName}. Must have systemName and non-zero debit/credit.`
      );
    }

    const accountId = await getAccountId(systemName);

    // Use findOne to be able to use session
    const account = await ChartOfAccount.findById(accountId)
      .select("_id accountType balance name") //  NEW: Added name
      .session(options.session || null);
    if (!account) {
      throw new Error(
        `Accounting error: Mapped account for "${systemName}" (ID: ${accountId}) not found.`
      );
    }

    if (account.name.toLowerCase().includes("bank")) {
      hitsBankAccount = true;
    }

    processedTransactions.push({
      accountId: account._id,
      debit,
      credit,
      billReference: { type: "None" },
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
    bankReconciliation: {
      isReconciled: !hitsBankAccount, // Auto-reconcile non-bank entries
      bankDate: null,
    },
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
  const {
    date,
    description,
    propertyId,
    transactions,
    performedBy,
    referenceType, // e.g., "Manual_Payment", "Manual_Sales"
    gstDetails,
  } = data;

  if (
    !date ||
    !description ||
    !propertyId ||
    !Array.isArray(transactions) ||
    transactions.length < 1 || // Can be 1 if GST is added
    !performedBy ||
    !referenceType
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
    const processedTransactions = [...transactions]; // Copy user-provided transactions
    let hitsBankAccount = false;

    if (
      gstDetails &&
      gstDetails.taxableAmount > 0 &&
      gstDetails.gstRate !== "Exempt" &&
      gstDetails.gstRate !== "Nil-Rated" &&
      gstDetails.gstRate !== "Not-Applicable"
    ) {
      const { gstRate, taxableAmount, isIntraState, isPurchase } = gstDetails;

      const rateValue = parseFloat(gstRate.split("-")[1]); // e.g., 18
      const totalGst = (taxableAmount * rateValue) / 100;

      // Find the correct GST accounts to use
      const { cgstId, sgstId, igstId } = await getGstAccountIds(
        gstRate,
        isIntraState,
        isPurchase
      );

      if (isIntraState) {
        const halfGst = totalGst / 2;
        if (isPurchase) {
          // Debit Input GST
          processedTransactions.push({
            accountId: cgstId,
            debit: halfGst,
            credit: 0,
            billReference: { type: "None" },
          });
          processedTransactions.push({
            accountId: sgstId,
            debit: halfGst,
            credit: 0,
            billReference: { type: "None" },
          });
        } else {
          // Credit Output GST
          processedTransactions.push({
            accountId: cgstId,
            debit: 0,
            credit: halfGst,
            billReference: { type: "None" },
          });
          processedTransactions.push({
            accountId: sgstId,
            debit: 0,
            credit: halfGst,
            billReference: { type: "None" },
          });
        }
      } else {
        // Inter-State (IGST)
        if (isPurchase) {
          processedTransactions.push({
            accountId: igstId,
            debit: totalGst,
            credit: 0,
            billReference: { type: "None" },
          });
        } else {
          processedTransactions.push({
            accountId: igstId,
            debit: 0,
            credit: totalGst,
            billReference: { type: "None" },
          });
        }
      }
    }

    // --- 2. Process all transactions (user-provided + GST) ---
    const billLedgerEntries = []; // To queue up bill ledger changes

    for (const trans of processedTransactions) {
      const { accountId, debit = 0, credit = 0, billReference } = trans;

      if (!accountId || (debit === 0 && credit === 0)) {
        throw new Error(
          "Invalid transaction. 'accountId' and a non-zero debit/credit are required."
        );
      }

      const account = await ChartOfAccount.findById(accountId).session(session);
      if (!account) {
        throw new Error(`Account with ID "${accountId}" not found.`);
      }

      // Check for BRS
      if (account.name.toLowerCase().includes("bank")) {
        hitsBankAccount = true;
      }

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

      // --- 3. Bill-wise Logic ---
      if (account.maintainsBillWise) {
        if (
          !billReference ||
          billReference.type === "None" ||
          !billReference.refNo
        ) {
          throw new Error(
            `Account ${account.name} requires bill-wise details (NewRef or AgainstRef).`
          );
        }

        // For AR (Asset), a debit is a new bill. For AP (Liability), a credit is a new bill.
        const isNewBill =
          (account.accountType === "Asset" && debit > 0) ||
          (account.accountType === "Liability" && credit > 0);

        if (billReference.type === "NewRef") {
          if (!isNewBill) {
            throw new Error(
              `'NewRef' is invalid for this transaction type on ${account.name}. Use 'AgainstRef' to settle a bill.`
            );
          }
          const billAmount = debit > 0 ? debit : credit;
          // Queue up the new bill to be created
          billLedgerEntries.push({
            model: BillLedger,
            op: "create",
            doc: {
              accountId,
              journalEntryId: null, // Will be updated after JE is saved
              billRefNo: billReference.refNo,
              billDate: date,
              dueDate: new Date(new Date(date).setDate(date.getDate() + 30)), // Default 30 days
              totalAmount: billAmount,
              pendingAmount: billAmount,
              status: "Pending",
              propertyId,
            },
          });
        } else if (billReference.type === "AgainstRef") {
          if (isNewBill) {
            throw new Error(
              `'AgainstRef' is invalid for this transaction type on ${account.name}. Use 'NewRef' to create a new bill.`
            );
          }
          // Find and apply payment against an existing bill
          const bill = await BillLedger.findOne({
            accountId,
            billRefNo: billReference.refNo,
            status: "Pending",
          }).session(session);
          if (!bill) {
            throw new Error(
              `Pending bill with reference "${billReference.refNo}" for account ${account.name} not found.`
            );
          }

          const paymentAmount =
            account.accountType === "Asset" && credit > 0 ? credit : debit;
          bill.pendingAmount -= paymentAmount;

          if (bill.pendingAmount < -0.01) {
            // Allow for small floating point errors
            throw new Error(
              `Payment (₹${paymentAmount}) exceeds pending amount (₹${
                bill.pendingAmount + paymentAmount
              }) for bill ${billReference.refNo}.`
            );
          }

          if (bill.pendingAmount <= 0.01) {
            bill.pendingAmount = 0;
            bill.status = "Cleared";
          }
          // Queue up the bill update
          billLedgerEntries.push({ model: bill, op: "save" });
        }
      }
    }

    // 4. Final Balance Check
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `Journal entry is unbalanced. Debits (₹${totalDebits}) != Credits (₹${totalCredits}).`
      );
    }

    // 5. Create the Journal Entry
    const manualEntry = new JournalEntry({
      date,
      description,
      propertyId,
      transactions: processedTransactions, // This now includes GST
      performedBy,
      referenceId: new mongoose.Types.ObjectId(), // A new ID just for reference
      referenceType, // "Manual_Payment", "Manual_Sales", etc.
      bankReconciliation: {
        isReconciled: !hitsBankAccount, // Auto-reconcile non-bank entries
        bankDate: null,
      },
    });
    await manualEntry.save({ session });

    // --- 6. Process BillLedger changes ---
    for (const entry of billLedgerEntries) {
      if (entry.op === "create") {
        entry.doc.journalEntryId = manualEntry._id; // Link to the JE we just created
        await BillLedger.create([entry.doc], { session });
      } else if (entry.op === "save") {
        await entry.model.save({ session });
      }
    }

    await session.commitTransaction();
    return {
      success: true,
      status: 201,
      data: manualEntry,
      message: "Manual journal entry created successfully.",
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in createManualJournalEntry:", error);
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
      // .populate({
      //   path: "referenceId",
      //   select: "name title transactionId paymentMethod paymentType",
      // })
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

// export const getJournalEntryById = async (data) => {
//   try {
//     console.log(data);
//     const { ledgerId } = data;
//     // ✅ Validate ObjectId
//     if (!mongoose.Types.ObjectId.isValid(ledgerId)) {
//       return {
//         success: false,
//         status: 400,
//         message: "Invalid journal entry ID.",
//       };
//     }

//     console.log("🔍 Fetching journal entry:", ledgerId);

//     // ✅ Fetch and populate
//     const journalEntry = await JournalEntry.findById(ledgerId)
//       .populate({
//         path: "transactions.accountId",
//         select: "name accountType balance",
//       })
//       .populate({
//         path: "referenceId",
//         select: "name title transactionId paymentMethod paymentType",
//       });

//     // ✅ Handle not found
//     if (!journalEntry) {
//       return {
//         success: false,
//         status: 404,
//         message: "Journal entry not found.",
//       };
//     }

//     // ✅ Compute totals for this entry
//     let totalDebit = 0;
//     let totalCredit = 0;

//     for (const txn of journalEntry.transactions || []) {
//       totalDebit += txn.debit || 0;
//       totalCredit += txn.credit || 0;
//     }

//     const balance = Math.abs(totalDebit - totalCredit);

//     // ✅ Return same response shape as getAllJournalEntries
//     return {
//       success: true,
//       status: 200,
//       data: journalEntry,
//       totals: {
//         totalDebit,
//         totalCredit,
//         balance,
//       },
//       message: "Journal entry fetched successfully.",
//     };
//   } catch (error) {
//     console.error("❌ Error fetching journal entry:", error);
//     return {
//       success: false,
//       status: 500,
//       message: error.message,
//     };
//   }
// };

export const getJournalEntryById = async (data) => {
  try {
    const { ledgerId } = data;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(ledgerId)) {
      return {
        success: false,
        status: 400,
        message: "Invalid journal entry ID.",
      };
    }

    // Fetch journal entry WITHOUT populating referenceId
    const journalEntry = await JournalEntry.findById(ledgerId).populate({
      path: "transactions.accountId",
      select: "name accountType balance",
    });

    if (!journalEntry) {
      return {
        success: false,
        status: 404,
        message: "Journal entry not found.",
      };
    }

    // Extract needed fields
    const { referenceId, referenceType } = journalEntry;

    let referenceData = null;

    // ---------------------------
    // ✅ Fetch external reference if type = Asset
    // ---------------------------
    if (referenceId && referenceType === "Asset") {
      try {
        referenceData = await sendRPCRequest(
          PROPERTY_PATTERN.INTERNAL.GET_ASSET_DATA_BY_ID,
          { assetId: referenceId.toString() }
        );
      } catch (err) {
        console.error("❌ RPC fetch asset failed:", err);
        referenceData = null; // do not break entire response
      }
    }

    if (referenceId && referenceType === "Inventory") {
      try {
        referenceData = await sendRPCRequest(
          INVENTORY_PATTERN.INTERNAL.GET_INVENTORY_DATA_BY_ID,
          { inventoryId: referenceId.toString() }
        );
      } catch (err) {
        console.error("❌ RPC fetch inventory failed:", err);
        referenceData = null; // do not break entire response
      }
    }

    // ---------------------------
    // ✅ Populate referenceId only if NOT asset and inventory
    // ---------------------------
    if (
      referenceId &&
      referenceType !== "Asset" &&
      referenceType !== "Inventory"
    ) {
      const populated = await JournalEntry.populate(journalEntry, {
        path: "referenceId",
        select:
          "name title transactionId paymentMethod paymentType paymentDate date",
      });

      referenceData = populated.referenceId;
    }

    // Compute totals
    let totalDebit = 0;
    let totalCredit = 0;

    for (const txn of journalEntry.transactions || []) {
      totalDebit += txn.debit || 0;
      totalCredit += txn.credit || 0;
    }

    const balance = Math.abs(totalDebit - totalCredit);

    return {
      success: true,
      status: 200,
      data: {
        ...journalEntry.toObject(),
        referenceData, // 🔥 consistent merged reference
      },
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
