import express from "express";

import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import {
  getAllBusPayments,
  initiateOnlineBusPayment,
  recordManualBusPayment,
  verifyAndRecordOnlineBusPayment,
} from "../../controllers/accounts/busPayment.controller.js";

const busPaymentRoutes = express.Router();

busPaymentRoutes.use(isAuthenticated);

busPaymentRoutes.post(
  "/initiate-online",
  hasPermission(PERMISSIONS.BUS_FEE_MANAGE),
  initiateOnlineBusPayment
);
busPaymentRoutes.post(
  "/verify-online",
  hasPermission(PERMISSIONS.BUS_FEE_MANAGE),
  verifyAndRecordOnlineBusPayment
);
busPaymentRoutes.post(
  "/record-manual",
  hasPermission(PERMISSIONS.BUS_FEE_MANAGE),
  recordManualBusPayment
);

busPaymentRoutes.get(
  "/",
  hasPermission(PERMISSIONS.BUS_FEE_VIEW),
  getAllBusPayments
);

export default busPaymentRoutes;
