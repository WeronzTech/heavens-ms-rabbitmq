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
} from "../../controllers/accounts/feePayments.controller.js";

const feePaymentRoutes = express.Router();

feePaymentRoutes.post("/add-payment", addFeePaymentController);

feePaymentRoutes.put("/update/:id", updateFeePaymentController);

feePaymentRoutes.get("/:paymentId", getFeePaymentController);

feePaymentRoutes.get("/", getAllFeePaymentsController);

feePaymentRoutes.get("/monthly", getMonthWiseRentCollectionController);

feePaymentRoutes.post("/initiate-online", initiateOnlinePayment);
feePaymentRoutes.post("/verify-online", verifyAndRecordOnlinePayment);
feePaymentRoutes.post("/record-manual", recordManualPayment);

export default feePaymentRoutes;
