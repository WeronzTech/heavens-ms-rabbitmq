import express from "express";
import {
  getAllDepositPayments,
  getTransactionHistoryByUserId,
  initiateOnlineDepositPayment,
  processAndRecordRefundPayment,
  recordManualDepositPayment,
  verifyAndRecordOnlineDepositPayment,
} from "../../controllers/accounts/depositPayments.controller.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";

const depositPaymentRoutes = express.Router();

depositPaymentRoutes.use(isAuthenticated);

depositPaymentRoutes.post(
  "/initiate-online",
  hasPermission(PERMISSIONS.DEPOSIT_MANAGE),
  initiateOnlineDepositPayment
);
depositPaymentRoutes.post(
  "/verify-online",
  hasPermission(PERMISSIONS.DEPOSIT_MANAGE),
  verifyAndRecordOnlineDepositPayment
);
depositPaymentRoutes.post(
  "/record-manual",
  hasPermission(PERMISSIONS.DEPOSIT_MANAGE),
  recordManualDepositPayment
);

depositPaymentRoutes.post(
  "/record-refund",
  hasPermission(PERMISSIONS.DEPOSIT_MANAGE),
  processAndRecordRefundPayment
);

depositPaymentRoutes.get(
  "/",
  hasPermission(PERMISSIONS.DEPOSIT_VIEW),
  getAllDepositPayments
);

depositPaymentRoutes.get(
  "/transactionHistory/:userId",
  hasPermission(PERMISSIONS.DEPOSIT_VIEW),
  getTransactionHistoryByUserId
);

export default depositPaymentRoutes;
