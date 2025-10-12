import { Router } from "express";
import {
  createMealBooking,
  deleteBooking,
  getBookingById,
  getBookingByProperty,
  getUserBookings,
  updateBookingStatus,
  checkNextDayBooking,
  createManualMealBookings,
} from "../../controllers/inventory/mealBooking.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const messBookingRoutes = Router();

messBookingRoutes.use(isAuthenticated);

messBookingRoutes.route("/get-booking").get(checkNextDayBooking);

messBookingRoutes
  .route("/")
  .post(hasPermission(PERMISSIONS.BOOKING_MANAGE), createMealBooking);

messBookingRoutes
  .route("/manual")
  .post(hasPermission(PERMISSIONS.BOOKING_MANAGE), createManualMealBookings);

messBookingRoutes
  .route("/property")
  .get(hasPermission(PERMISSIONS.BOOKING_VIEW), getBookingByProperty);

messBookingRoutes
  .route("/:bookingId")
  .get(hasPermission(PERMISSIONS.BOOKING_VIEW), getBookingById)
  .delete(hasPermission(PERMISSIONS.BOOKING_MANAGE), deleteBooking);

messBookingRoutes
  .route("/user/:userId")
  .get(hasPermission(PERMISSIONS.BOOKING_VIEW), getUserBookings);

messBookingRoutes
  .route("/:bookingId/status")
  .patch(hasPermission(PERMISSIONS.BOOKING_MANAGE), updateBookingStatus);

export default messBookingRoutes;
