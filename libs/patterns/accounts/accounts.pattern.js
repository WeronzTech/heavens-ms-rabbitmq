export const ACCOUNTS_PATTERN = {
  FEE_PAYMENTS: {
    ADD_FEE_PAYMENTS: "add_fee_payments",
    UPDATE_FEE_PAYMENT: "update_fee_payments",
    GET_FEE_PAYMENT: "get_fee_payment",
    INITIATE_ONLINE: "payment_initiate_online",
    VERIFY_ONLINE: "payment_verify_online",
    RECORD_MANUAL: "payment_record_manual",
    GET_ALL_FEE_PAYMENTS: "get_all_fee_payments",
    GET_MONTHWISE_TOTAL_COLLECTION: "get_monthwise_total_collection",
    GET_ALL_PENDING_PAYMENTS: "get_all_pending_payments",
    GET_LATEST_BY_USERS: "get_latest_by_users",
    GET_FINANCIAL_SUMMARY: "get_Financial_Summary",
    GET_NEXT_DUE_DATE: "get_next_due_date",
    GET_PAYMENT_SUMMARY: "get_payment_summary",
    GET_PAYMENTS_BY_USERID: "get_payments_by_userId",
    GET_WAVEOFF_PAYMENTS: "get_waveoff_payments",
    GET_ALL_CASH_PAYMENTS: "get_all_cash_payments",
  },
  COMMISSION: {
    ADD_COMMISSION: "add_commission",
    GET_COMMISSION_BY_ID: "get_commission_by_id",
    GET_ALL_COMMISSION: "get_all_commission",
    EDIT_COMMISSION: "edit_commission",
    DELETE_COMMISSION: "delete_commission",
    GET_ALL_COMMISSION_BY_USER: "get_all_commission_by_user",
  },
  DASHBOARD: {
    GET_ACCOUNT_DASHBAORD_DATA_FOR_INCOME_SECTION:
      "get_account_dashbaord_data_for_income_section",
    GET_ACCOUNT_DASHBAORD_DATA_FOR_EXPENESE_SECTION:
      "get_account_dashbaord_data_for_expense_section",
  },
  EXPENSE: {
    ADD_EXPENSE: "add_expense",
    GET_ALL_EXPENSES: "get_all_expense",
    GET_EXPENSE_BY_ID: "get_expense_by_id",
    DELETE_EXPENSE: "delete_expense",
    ADD_EXPENSE_CATEGORY: "add_expense_category",
    GET_CATEGORY_BY_MAINCATEROGY: "get_category_by_main_category",
    GET_ALL_CATEGORIES: "get_all_categories",
    DELETE_CATEGORY: "delete_category",
    GET_PETTYCASH_PAYMENTS_BY_MANAGER: "get_pettyCash_payments_by_manager"
  },
  VOUCHER: {
    ADD_VOUCHER: "add_voucher",
  }
};
