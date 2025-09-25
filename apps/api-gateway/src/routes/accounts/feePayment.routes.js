import express from "express";
import {
  addFeePaymentController,
  getFeePaymentController,
  initiateOnlinePayment,
  recordManualPayment,
  updateFeePaymentController,
  verifyAndRecordOnlinePayment,
} from "../../controllers/accounts/feePayments.controller.js";

const feePaymentRoutes = express.Router();

feePaymentRoutes.post("/add-payment", addFeePaymentController);

feePaymentRoutes.put("/update/:id", updateFeePaymentController);

feePaymentRoutes.get("/:id", getFeePaymentController);

feePaymentRoutes.post("/initiate-online", initiateOnlinePayment);
feePaymentRoutes.post("/verify-online", verifyAndRecordOnlinePayment);
feePaymentRoutes.post("/record-manual", recordManualPayment);

export default feePaymentRoutes;
