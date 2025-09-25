import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  addFeePayment,
  getFeePaymentById,
  initiateOnlinePayment,
  recordManualPayment,
  updateFeePayment,
  verifyAndRecordOnlinePayment,
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
