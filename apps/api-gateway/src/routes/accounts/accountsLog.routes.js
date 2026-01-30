import express from "express";
import { getAccountLogs } from "../../controllers/accounts/accountsLog.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const logRoutes = express.Router();

logRoutes.use(isAuthenticated);

logRoutes.get(
  "/",
  hasPermission(PERMISSIONS.LOGS_ACCOUNTS_VIEW),
  getAccountLogs,
);

export default logRoutes;
