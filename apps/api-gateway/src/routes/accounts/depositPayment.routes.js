import express from "express";
import {
  getAllDepositPayments,
  initiateOnlineDepositPayment,
  processAndRecordRefundPayment,
  recordManualDepositPayment,
  verifyAndRecordOnlineDepositPayment,
} from "../../controllers/accounts/depositPayments.controller.js";

const depositPaymentRoutes = express.Router();

depositPaymentRoutes.post("/initiate-online", initiateOnlineDepositPayment);
depositPaymentRoutes.post(
  "/verify-online",
  verifyAndRecordOnlineDepositPayment
);
depositPaymentRoutes.post("/record-manual", recordManualDepositPayment);

depositPaymentRoutes.post("/record-refund", processAndRecordRefundPayment);

depositPaymentRoutes.get("/", getAllDepositPayments);

export default depositPaymentRoutes;
