import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";

import {
  addFeePayment,
  getFeePaymentById,
  initiateOnlinePayment,
  recordManualPayment,
  updateFeePayment,
  verifyAndRecordOnlinePayment,
  getAllFeePayments,
  getMonthWiseRentCollection,
  getFinancialSummary,
  getNextDueDate,
  getAllAccountsPayments,
  getFeePaymentsByUserId,
  getLatestPaymentsByUsers,
  getWaveOffedPayments,
  getAllCashPayments,
  getLatestFeePaymentByUserId,
} from "../service/feePayment.service.js";

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.ADD_FEE_PAYMENTS,
  async (data) => {
    return await addFeePayment(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.UPDATE_FEE_PAYMENT,
  async (data) => {
    return await updateFeePayment(data);
  }
);

createResponder(ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_FEE_PAYMENT, async (data) => {
  return await getFeePaymentById(data);
});

createResponder(ACCOUNTS_PATTERN.FEE_PAYMENTS.INITIATE_ONLINE, async (data) => {
  return await initiateOnlinePayment(data);
});

createResponder(ACCOUNTS_PATTERN.FEE_PAYMENTS.VERIFY_ONLINE, async (data) => {
  return await verifyAndRecordOnlinePayment(data);
});

createResponder(ACCOUNTS_PATTERN.FEE_PAYMENTS.RECORD_MANUAL, async (data) => {
  return await recordManualPayment(data);
});

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_ALL_FEE_PAYMENTS,
  async (data) => {
    return await getAllFeePayments(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_MONTHWISE_TOTAL_COLLECTION,
  async (data) => {
    return await getMonthWiseRentCollection(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_FINANCIAL_SUMMARY,
  async (data) => {
    return await getFinancialSummary(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_NEXT_DUE_DATE,
  async (data) => {
    return await getNextDueDate(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_LATEST_BY_USERS,
  async ({ userIds }) => {
    return await getLatestPaymentsByUsers({ userIds });
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_PAYMENT_SUMMARY,
  async (data) => {
    return await getAllAccountsPayments(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_PAYMENTS_BY_USERID,
  async (data) => {
    return await getFeePaymentsByUserId(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_WAVEOFF_PAYMENTS,
  async (data) => {
    return await getWaveOffedPayments(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_ALL_CASH_PAYMENTS,
  async (data) => {
    return await getAllCashPayments(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_LATEST_PAYMENT_BY_USERID,
  async (data) => {
    return await getLatestFeePaymentByUserId(data);
  }
);
