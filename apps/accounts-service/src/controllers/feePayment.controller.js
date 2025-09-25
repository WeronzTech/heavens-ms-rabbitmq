import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  addFeePayment,
  getAllFeePayments,
  getFeePaymentById,
  getFinancialSummary,
  getMonthWiseRentCollection,
  updateFeePayment,
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
