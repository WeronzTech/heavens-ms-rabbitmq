import express from "express";
import {
  addVendor,
  editVendor,
  getAllVendors,
  getVendorSummary,
} from "../../controllers/accounts/vendor.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const vendorRoutes = express.Router();
vendorRoutes.use(isAuthenticated);

vendorRoutes.post("/", hasPermission(PERMISSIONS.ACCOUNTS_MANAGE), addVendor);

vendorRoutes.put("/", hasPermission(PERMISSIONS.ACCOUNTS_MANAGE), editVendor);

vendorRoutes.get("/", hasPermission(PERMISSIONS.ACCOUNTS_VIEW), getAllVendors);

vendorRoutes.get(
  "/summary/:vendorId",
  hasPermission(PERMISSIONS.ACCOUNTS_VIEW),
  getVendorSummary,
);

export default vendorRoutes;
