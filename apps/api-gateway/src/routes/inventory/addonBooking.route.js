import express from "express";
import {
  createAddonBooking,
  getAddonBookingsByProperty,
  getAddonBookingsForUser,
  getAddonBookingById,
  updateAddonBookingStatus,
} from "../../controllers/inventory/addonBooking.controller.js";

const addonBookingRoutes = express.Router();

addonBookingRoutes.route("/").post(createAddonBooking);
addonBookingRoutes.route("/property").get(getAddonBookingsByProperty);
addonBookingRoutes.route("/user/:userId").get(getAddonBookingsForUser);
addonBookingRoutes.route("/:bookingId").get(getAddonBookingById);
addonBookingRoutes.route("/:bookingId/status").patch(updateAddonBookingStatus);

export default addonBookingRoutes;
