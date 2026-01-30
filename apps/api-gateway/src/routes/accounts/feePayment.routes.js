import express from "express";
import {
  addFeePaymentController,
  getFeePaymentController,
  getAllFeePaymentsController,
  initiateOnlinePayment,
  recordManualPayment,
  updateFeePaymentController,
  verifyAndRecordOnlinePayment,
  getMonthWiseRentCollectionController,
  getFinancialSummary,
  getNextDueDate,
  getAllAccountsPaymentController,
  getUserPaymentsController,
  getWaveOffedPaymentsController,
  getAllCashPaymentsController,
  getLatestFeePaymentByUserId,
  getFeePaymentsAnalytics,
  getTransactionHistoryByUserId,
} from "../../controllers/accounts/feePayments.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const feePaymentRoutes = express.Router();

feePaymentRoutes.use(isAuthenticated);

feePaymentRoutes.post(
  "/add-payment",
  hasPermission(PERMISSIONS.FEE_PAYMENT_MANAGE),
  addFeePaymentController,
);

feePaymentRoutes.get(
  "/monthly",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getMonthWiseRentCollectionController,
);

feePaymentRoutes.get(
  "/financial/summary",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getFinancialSummary,
);

feePaymentRoutes.post(
  "/initiate-online",
  hasPermission(PERMISSIONS.FEE_PAYMENT_MANAGE),
  initiateOnlinePayment,
);
feePaymentRoutes.post(
  "/verify-online",
  hasPermission(PERMISSIONS.FEE_PAYMENT_MANAGE),
  verifyAndRecordOnlinePayment,
);
feePaymentRoutes.post(
  "/record-manual",
  hasPermission(PERMISSIONS.FEE_PAYMENT_MANAGE),
  recordManualPayment,
);
feePaymentRoutes.get("/next-due-date", getNextDueDate);
feePaymentRoutes.put(
  "/update/:id",
  hasPermission(PERMISSIONS.FEE_PAYMENT_MANAGE),
  updateFeePaymentController,
);

feePaymentRoutes.get(
  "/",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getAllFeePaymentsController,
);

feePaymentRoutes.get(
  "/get_all_payments",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getAllAccountsPaymentController,
);

feePaymentRoutes.get("/user-payments", getUserPaymentsController);

feePaymentRoutes.get(
  "/transactionHistory/:userId",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getTransactionHistoryByUserId,
);

feePaymentRoutes.get(
  "/latestPayment/:userId",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getLatestFeePaymentByUserId,
);

feePaymentRoutes.get(
  "/waveoff",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getWaveOffedPaymentsController,
);

feePaymentRoutes.get(
  "/cashPayments",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getAllCashPaymentsController,
);

feePaymentRoutes.get(
  "/analytics",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getFeePaymentsAnalytics,
);

feePaymentRoutes.get(
  "/:paymentId",
  hasPermission(PERMISSIONS.TRANSACTIONS_VIEW),
  getFeePaymentController,
);

export default feePaymentRoutes;
