import express from "express";
import {
  addVoucherController,
  deleteVoucherController,
  getVoucherByPropertyController,
} from "../../controllers/accounts/voucher.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const voucherRoutes = express.Router();

voucherRoutes.use(isAuthenticated);

voucherRoutes.post(
  "/add",
  hasPermission(PERMISSIONS.VOUCHER_MANAGE),
  addVoucherController
);

voucherRoutes.get(
  "/by-property",
  hasPermission(PERMISSIONS.VOUCHER_VIEW),
  getVoucherByPropertyController
);

voucherRoutes.delete(
  "/:voucherId",
  hasPermission(PERMISSIONS.VOUCHER_MANAGE),
  deleteVoucherController
);

export default voucherRoutes;
