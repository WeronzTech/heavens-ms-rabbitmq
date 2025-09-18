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

const addonRoutes = Router();

addonRoutes
  .route("/kitchen")
  .post(upload.fields([{ name: "itemImage", maxCount: 1 }]), createAddon)
  .get(getAllAddons);

addonRoutes.route("/user").get(getAddonByPropertyId);

addonRoutes
  .route("/:addonId")
  .get(getAddonById)
  .patch(upload.fields([{ name: "itemImage", maxCount: 1 }]), updateAddon)
  .delete(deleteAddon);

addonRoutes.route("/availability/:addonId").patch(updateAddonAvailability);

export default addonRoutes;
