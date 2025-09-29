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
} from "../../controllers/accounts/feePayments.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";

const feePaymentRoutes = express.Router();

feePaymentRoutes.post("/add-payment", addFeePaymentController);

feePaymentRoutes.get("/monthly", getMonthWiseRentCollectionController);

feePaymentRoutes.get("/financial/summary", getFinancialSummary);

feePaymentRoutes.post("/initiate-online", initiateOnlinePayment);
feePaymentRoutes.post("/verify-online", verifyAndRecordOnlinePayment);
feePaymentRoutes.post("/record-manual", recordManualPayment);
feePaymentRoutes.get("/next-due-date", isAuthenticated, getNextDueDate);
feePaymentRoutes.put("/update/:id", updateFeePaymentController);

feePaymentRoutes.get("/", getAllFeePaymentsController);

feePaymentRoutes.get("/get_all_payments", getAllAccountsPaymentController);

feePaymentRoutes.get("/user-payments", isAuthenticated, getUserPaymentsController);

feePaymentRoutes.get("/:paymentId", getFeePaymentController);

export default feePaymentRoutes;
