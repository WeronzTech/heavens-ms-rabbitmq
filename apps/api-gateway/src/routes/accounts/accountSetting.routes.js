import { Router } from "express";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import {
  setAccountMapping,
  getAccountMappings,
  getAvailableSystemNames,
} from "../../controllers/accounts/accounting.controller.js"; // Note: We'll add these to accounting.controller.js

const accountSettingRoutes = Router();

accountSettingRoutes.use(isAuthenticated);
accountSettingRoutes.use(hasPermission(PERMISSIONS.ACCOUNTS_MANAGE)); // Only admins can change settings

// Get all currently set mappings
accountSettingRoutes.get("/", getAccountMappings);

// Get all available system names for the dropdown
accountSettingRoutes.get("/system-names", getAvailableSystemNames);

// Create or Update a mapping
accountSettingRoutes.post("/", setAccountMapping);

export default accountSettingRoutes;
