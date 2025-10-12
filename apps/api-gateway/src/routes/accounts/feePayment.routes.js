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
  addFeePaymentController
);

feePaymentRoutes.get(
  "/monthly",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getMonthWiseRentCollectionController
);

feePaymentRoutes.get(
  "/financial/summary",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getFinancialSummary
);

feePaymentRoutes.post(
  "/initiate-online",
  hasPermission(PERMISSIONS.FEE_PAYMENT_MANAGE),
  initiateOnlinePayment
);
feePaymentRoutes.post(
  "/verify-online",
  hasPermission(PERMISSIONS.FEE_PAYMENT_MANAGE),
  verifyAndRecordOnlinePayment
);
feePaymentRoutes.post(
  "/record-manual",
  hasPermission(PERMISSIONS.FEE_PAYMENT_MANAGE),
  recordManualPayment
);
feePaymentRoutes.get("/next-due-date", getNextDueDate);
feePaymentRoutes.put(
  "/update/:id",
  hasPermission(PERMISSIONS.FEE_PAYMENT_MANAGE),
  updateFeePaymentController
);

feePaymentRoutes.get(
  "/",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getAllFeePaymentsController
);

feePaymentRoutes.get(
  "/get_all_payments",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getAllAccountsPaymentController
);

feePaymentRoutes.get("/user-payments", getUserPaymentsController);

feePaymentRoutes.get(
  "/transactionHistory/:userId",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getTransactionHistoryByUserId
);

feePaymentRoutes.get(
  "/latestPayment/:userId",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getLatestFeePaymentByUserId
);

feePaymentRoutes.get(
  "/waveoff",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getWaveOffedPaymentsController
);

feePaymentRoutes.get(
  "/cashPayments",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getAllCashPaymentsController
);

feePaymentRoutes.get(
  "/analytics",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getFeePaymentsAnalytics
);

feePaymentRoutes.get(
  "/:paymentId",
  hasPermission(PERMISSIONS.FEE_PAYMENT_VIEW),
  getFeePaymentController
);

export default feePaymentRoutes;
