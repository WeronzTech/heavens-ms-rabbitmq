import express from "express";
import {
  addFeePaymentController,
  getAllFeePaymentsController,
  getFeePaymentController,
  getFinancialSummary,
  getMonthWiseRentCollectionController,
  updateFeePaymentController,
} from "../../controllers/accounts/feePayments.controller.js";

const feePaymentRoutes = express.Router();

feePaymentRoutes.post("/add-payment", addFeePaymentController);

feePaymentRoutes.put("/update/:id", updateFeePaymentController);

feePaymentRoutes.get("/:paymentId", getFeePaymentController);

feePaymentRoutes.get("/", getAllFeePaymentsController);

feePaymentRoutes.get("/monthly", getMonthWiseRentCollectionController);

feePaymentRoutes.get("/financial/summary", getFinancialSummary);

export default feePaymentRoutes;
