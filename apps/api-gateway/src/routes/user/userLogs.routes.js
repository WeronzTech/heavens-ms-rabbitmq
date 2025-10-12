import express from "express";
import { getActivityLogs } from "../../controllers/user/userLog.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const userLogRoutes = express.Router();

userLogRoutes.use(isAuthenticated);

userLogRoutes.get(
  "/activityLogs",
  hasPermission(PERMISSIONS.LOGS_USER_VIEW),
  getActivityLogs
);

export default userLogRoutes;
