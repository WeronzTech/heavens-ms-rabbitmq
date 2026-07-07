import {Router} from "express";

import {isAuthenticated} from "../../middleware/isAuthenticated.js";
import {hasPermission} from "../../middleware/hasPermission.js";
import {PERMISSIONS} from "../../../../../libs/common/permissions.list.js";
import {
  createAppSettings,
  getAppSettings,
  getAppSettingsAdmin,
  updateAppSettings,
} from "../../controllers/user/appSetting.controller.js";

const appSettingsRoutes = Router();

appSettingsRoutes.post("/app-settings", isAuthenticated, createAppSettings);

appSettingsRoutes.get("/app-settings", isAuthenticated, getAppSettings);

appSettingsRoutes.get(
  "/admin/app-settings",
  isAuthenticated,
  getAppSettingsAdmin,
);

appSettingsRoutes.put("/app-settings", isAuthenticated, updateAppSettings);

export default appSettingsRoutes;
