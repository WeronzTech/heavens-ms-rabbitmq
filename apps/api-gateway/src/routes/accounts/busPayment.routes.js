import express from "express";

// import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
// import { hasPermission } from "../../middleware/hasPermission.js";
import {
  getAllBusPayments,
  getTransactionHistoryByUserId,
  initiateOnlineBusPayment,
  recordManualBusPayment,
  verifyAndRecordOnlineBusPayment,
} from "../../controllers/accounts/busPayment.controller.js";

const busPaymentRoutes = express.Router();

busPaymentRoutes.use(isAuthenticated);

busPaymentRoutes.post("/initiate-online", initiateOnlineBusPayment);
busPaymentRoutes.post("/verify-online", verifyAndRecordOnlineBusPayment);
busPaymentRoutes.post("/record-manual", recordManualBusPayment);

busPaymentRoutes.get("/", getAllBusPayments);

busPaymentRoutes.get(
  "/transactionHistory/:userId",
  getTransactionHistoryByUserId,
);

export default busPaymentRoutes;
