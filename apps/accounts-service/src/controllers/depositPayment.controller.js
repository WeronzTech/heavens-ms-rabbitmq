import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  getAllDepositPayments,
  getLatestDepositPaymentsByUsers,
  initiateOnlineDepositPayment,
  recordManualDepositPayment,
  verifyAndRecordOnlineDepositPayment,
} from "../service/depositPayment.service.js";

createResponder(
  ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.INITIATE_ONLINE_DEPOSIT,
  async (data) => {
    return await initiateOnlineDepositPayment(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.VERIFY_ONLINE_DEPOSIT,
  async (data) => {
    return await verifyAndRecordOnlineDepositPayment(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.RECORD_MANUAL_DEPOSIT,
  async (data) => {
    return await recordManualDepositPayment(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.GET_ALL_DEPOSIT_PAYMENTS,
  async (data) => {
    return await getAllDepositPayments(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.GET_LATEST_DEPOSIT_PAYMENT_BY_USERID,
  async (data) => {
    return await getLatestDepositPaymentsByUsers(data);
  }
);
