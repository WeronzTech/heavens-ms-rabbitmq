import { Router } from "express";
import {
  createAddon,
  deleteAddon,
  getAddonById,
  getAddonByPropertyId,
  getAllAddons,
  updateAddon,
  updateAddonAvailability,
} from "../../controllers/inventory/addon.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const addonRoutes = Router();

addonRoutes.use(isAuthenticated);

addonRoutes
  .route("/kitchen")
  .post(
    hasPermission(PERMISSIONS.ADDON_MANAGE),
    upload.fields([{ name: "itemImage", maxCount: 1 }]),
    createAddon
  )
  .get(hasPermission(PERMISSIONS.ADDON_VIEW), getAllAddons);

addonRoutes.get(
  "/user",
  hasPermission(PERMISSIONS.ADDON_VIEW),
  getAddonByPropertyId
);

addonRoutes
  .route("/:addonId")
  .get(hasPermission(PERMISSIONS.ADDON_VIEW), getAddonById)
  .patch(
    hasPermission(PERMISSIONS.ADDON_MANAGE),
    upload.fields([{ name: "itemImage", maxCount: 1 }]),
    updateAddon
  )
  .delete(hasPermission(PERMISSIONS.ADDON_MANAGE), deleteAddon);

addonRoutes
  .route("/availability/:addonId")
  .patch(hasPermission(PERMISSIONS.ADDON_MANAGE), updateAddonAvailability);

export default addonRoutes;
