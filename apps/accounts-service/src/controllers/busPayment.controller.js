import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  recordManualBusPayment,
  initiateOnlineBusPayment,
  verifyAndRecordOnlineBusPayment,
  getAllBusPayments,
  getLatestBusPaymentsByUsers,
  getTransactionHistoryByUserId,
} from "../service/busPayment.service.js";

createResponder(
  ACCOUNTS_PATTERN.BUS_PAYMENTS.INITIATE_ONLINE_BUS_PAYMENT,
  async (data) => {
    return await initiateOnlineBusPayment(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.BUS_PAYMENTS.VERIFY_ONLINE_BUS_PAYMENT,
  async (data) => {
    return await verifyAndRecordOnlineBusPayment(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.BUS_PAYMENTS.RECORD_MANUAL_BUS_PAYMENT,
  async (data) => {
    return await recordManualBusPayment(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.BUS_PAYMENTS.GET_ALL_BUS_PAYMENTS,
  async (data) => {
    return await getAllBusPayments(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.BUS_PAYMENTS.GET_LATEST_BUS_PAYMENT_BY_USERID,
  async (data) => {
    return await getLatestBusPaymentsByUsers(data);
  }
);

createResponder(
  ACCOUNTS_PATTERN.BUS_PAYMENTS.GET_TRANSACTIONS_BY_USERID,
  async (data) => {
    return await getTransactionHistoryByUserId(data);
  }
);
