import express from "express";
import {
  getAllDepositPayments,
  getTransactionHistoryByUserId,
  initiateOnlineDepositPayment,
  processAndRecordRefundPayment,
  recordManualDepositPayment,
  verifyAndRecordOnlineDepositPayment,
} from "../../controllers/accounts/depositPayments.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
// import { hasPermission } from "../../middleware/hasPermission.js";
// import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const depositPaymentRoutes = express.Router();

depositPaymentRoutes.use(isAuthenticated);

depositPaymentRoutes.post("/initiate-online", initiateOnlineDepositPayment);
depositPaymentRoutes.post(
  "/verify-online",
  verifyAndRecordOnlineDepositPayment,
);
depositPaymentRoutes.post("/record-manual", recordManualDepositPayment);

depositPaymentRoutes.post("/record-refund", processAndRecordRefundPayment);

depositPaymentRoutes.get("/", getAllDepositPayments);

depositPaymentRoutes.get(
  "/transactionHistory/:userId",
  getTransactionHistoryByUserId,
);

export default depositPaymentRoutes;
