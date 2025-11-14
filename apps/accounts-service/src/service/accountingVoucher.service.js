// ⭐️ --- START UPDATE ---
// This is a NEW FILE to provide Tally-style voucher logic.
import { createManualJournalEntry } from "./accounting.service.js";
import ChartOfAccount from "../models/chartOfAccounts.model.js";

/**
 * Creates a Payment Voucher (F5).
 * Debits an Expense/Asset/Liability account.
 * Credits a Cash/Bank account.
 */
export const createPaymentVoucher = async (data) => {
  const {
    date,
    creditAccountId,
    debitAccountId,
    amount,
    description,
    propertyId,
    performedBy,
    billReference,
    gstDetails,
  } = data;

  if (!creditAccountId || !debitAccountId || !amount) {
    return {
      success: false,
      status: 400,
      message: "Credit Account, Debit Account, and Amount are required.",
    };
  }

  // Validate credit account is Cash/Bank
  const creditAccount = await ChartOfAccount.findById(creditAccountId).lean();
  if (
    !creditAccount ||
    !["Asset"].includes(creditAccount.accountType) ||
    (!creditAccount.name.toLowerCase().includes("cash") &&
      !creditAccount.name.toLowerCase().includes("bank"))
  ) {
    return {
      success: false,
      status: 400,
      message: "Payment 'From' account must be a Cash or Bank account (Asset).",
    };
  }

  const transactions = [
    { accountId: debitAccountId, debit: amount, credit: 0, billReference }, // Bill ref applies to the party/expense
    {
      accountId: creditAccountId,
      debit: 0,
      credit: amount,
      billReference: { type: "None" },
    },
  ];

  return createManualJournalEntry({
    date,
    description: `Payment: ${description}`,
    propertyId,
    transactions,
    performedBy,
    referenceType: "Manual_Payment",
    gstDetails, // Pass GST details for purchase/expense GST
  });
};

/**
 * Creates a Receipt Voucher (F6).
 * Debits a Cash/Bank account.
 * Credits an Income/Asset/Liability account.
 */
export const createReceiptVoucher = async (data) => {
  const {
    date,
    debitAccountId,
    creditAccountId,
    amount,
    description,
    propertyId,
    performedBy,
    billReference,
    gstDetails,
  } = data;

  if (!creditAccountId || !debitAccountId || !amount) {
    return {
      success: false,
      status: 400,
      message: "Credit Account, Debit Account, and Amount are required.",
    };
  }

  // Validate debit account is Cash/Bank
  const debitAccount = await ChartOfAccount.findById(debitAccountId).lean();
  if (
    !debitAccount ||
    !["Asset"].includes(debitAccount.accountType) ||
    (!debitAccount.name.toLowerCase().includes("cash") &&
      !debitAccount.name.toLowerCase().includes("bank"))
  ) {
    return {
      success: false,
      status: 400,
      message: "Receipt 'To' account must be a Cash or Bank account (Asset).",
    };
  }

  const transactions = [
    {
      accountId: debitAccountId,
      debit: amount,
      credit: 0,
      billReference: { type: "None" },
    },
    { accountId: creditAccountId, debit: 0, credit: amount, billReference }, // Bill ref applies to the party/income
  ];

  return createManualJournalEntry({
    date,
    description: `Receipt: ${description}`,
    propertyId,
    transactions,
    performedBy,
    referenceType: "Manual_Receipt",
    gstDetails, // Pass GST details for sales GST
  });
};

/**
 * Creates a Contra Voucher (F4).
 * Debits a Cash/Bank account.
 * Credits a Cash/Bank account.
 */
export const createContraVoucher = async (data) => {
  const {
    date,
    debitAccountId,
    creditAccountId,
    amount,
    description,
    propertyId,
    performedBy,
  } = data;

  if (!creditAccountId || !debitAccountId || !amount) {
    return {
      success: false,
      status: 400,
      message: "Credit Account, Debit Account, and Amount are required.",
    };
  }

  // Validate both accounts are Cash/Bank (Assets)
  const [debitAccount, creditAccount] = await Promise.all([
    ChartOfAccount.findById(debitAccountId).lean(),
    ChartOfAccount.findById(creditAccountId).lean(),
  ]);

  const isDebitBankCash =
    debitAccount &&
    debitAccount.accountType === "Asset" &&
    (debitAccount.name.toLowerCase().includes("cash") ||
      debitAccount.name.toLowerCase().includes("bank"));
  const isCreditBankCash =
    creditAccount &&
    creditAccount.accountType === "Asset" &&
    (creditAccount.name.toLowerCase().includes("cash") ||
      creditAccount.name.toLowerCase().includes("bank"));

  if (!isDebitBankCash || !isCreditBankCash) {
    return {
      success: false,
      status: 400,
      message:
        "Contra entries must be between two Cash or Bank accounts (Assets).",
    };
  }

  const transactions = [
    {
      accountId: debitAccountId,
      debit: amount,
      credit: 0,
      billReference: { type: "None" },
    },
    {
      accountId: creditAccountId,
      debit: 0,
      credit: amount,
      billReference: { type: "None" },
    },
  ];

  return createManualJournalEntry({
    date,
    description: `Contra: ${description}`,
    propertyId,
    transactions,
    performedBy,
    referenceType: "Manual_Contra",
  });
};
// ⭐️ --- END UPDATE ---
