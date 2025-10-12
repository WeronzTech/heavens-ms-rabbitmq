import express from "express";
import {
  createAddonBooking,
  getAddonBookingsByProperty,
  getAddonBookingsForUser,
  getAddonBookingById,
  updateAddonBookingStatus,
  verifyAddonBookingPayment,
} from "../../controllers/inventory/addonBooking.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const addonBookingRoutes = express.Router();

addonBookingRoutes.use(isAuthenticated);

addonBookingRoutes
  .route("/")
  .post(hasPermission(PERMISSIONS.BOOKING_MANAGE), createAddonBooking);
addonBookingRoutes
  .route("/verify-payment")
  .post(hasPermission(PERMISSIONS.BOOKING_MANAGE), verifyAddonBookingPayment);
addonBookingRoutes
  .route("/property")
  .get(hasPermission(PERMISSIONS.BOOKING_VIEW), getAddonBookingsByProperty);
addonBookingRoutes
  .route("/user/:userId")
  .get(hasPermission(PERMISSIONS.BOOKING_VIEW), getAddonBookingsForUser);
addonBookingRoutes
  .route("/:bookingId")
  .get(hasPermission(PERMISSIONS.BOOKING_VIEW), getAddonBookingById);
addonBookingRoutes
  .route("/:bookingId/status")
  .patch(hasPermission(PERMISSIONS.BOOKING_MANAGE), updateAddonBookingStatus);

export default addonBookingRoutes;
