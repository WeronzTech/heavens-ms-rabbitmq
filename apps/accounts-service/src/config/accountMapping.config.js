/**
 * Defines standard account names used for automated journal entries.
 * These names MUST match the 'name' field of an account in the ChartOfAccount collection.
 */
export const ACCOUNT_NAMES = {
  // ----- ASSETS -----
  BANK_ACCOUNT: "Bank Account", // Or "Cash in Hand" if 'Cash' payment method
  PETTY_CASH: "Petty Cash",
  ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  INVENTORY_ASSET: "Inventory",
  FURNITURE_ASSET: "Furniture & Fixtures",
  SALARY_ADVANCE_ASSET: "Salary Advances",

  // ----- LIABILITIES -----
  SECURITY_DEPOSIT_LIABILITY: "Security Deposits Liability",
  ACCOUNTS_PAYABLE: "Accounts Payable",
  SALARIES_PAYABLE: "Salaries Payable",
  GST_PAYABLE: "GST Payable",

  // ----- INCOME -----
  RENT_INCOME: "Rent Income",
  DEPOSIT_INCOME: "Deposit Income (Non-Refundable)", // For non-refundable portions
  MISC_INCOME: "Miscellaneous Income",

  // ----- EXPENSES -----
  SALARIES_EXPENSE: "Salaries & Wages",
  COMMISSION_EXPENSE: "Commission Expense",
  MAINTENANCE_EXPENSE: "Maintenance Expense",
  GENERAL_EXPENSE: "General Expense", // A fallback
  MESS_SUPPLIES_EXPENSE: "Mess Supplies Expense",
  UTILITIES_EXPENSE: "Utilities Expense",
};
