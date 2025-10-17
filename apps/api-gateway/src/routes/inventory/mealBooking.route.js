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
  getUsageForPreparation,
} from "../../controllers/inventory/mealBooking.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const messBookingRoutes = Router();

// --- MOST SPECIFIC STATIC ROUTES FIRST ---

messBookingRoutes
  .route("/get-booking")
  .get(isAuthenticated, checkNextDayBooking);

messBookingRoutes
  .route("/get-usage")
  .get(isAuthenticated, getUsageForPreparation);

messBookingRoutes
  .route("/manual")
  .post(
    isAuthenticated,
    hasPermission(PERMISSIONS.BOOKING_MANAGE),
    createManualMealBookings
  );

messBookingRoutes
  .route("/property")
  .get(
    isAuthenticated,
    hasPermission(PERMISSIONS.BOOKING_VIEW),
    getBookingByProperty
  );

messBookingRoutes
  .route("/")
  .post(
    isAuthenticated,
    hasPermission(PERMISSIONS.BOOKING_MANAGE),
    createMealBooking
  );

// --- DYNAMIC (PARAMETERIZED) ROUTES LAST ---

messBookingRoutes.route("/status/:bookingId").patch(updateBookingStatus);

messBookingRoutes
  .route("/user/:userId")
  .get(
    isAuthenticated,
    hasPermission(PERMISSIONS.BOOKING_VIEW),
    getUserBookings
  );

// This is the most generic route, so it MUST come after all other specific routes.
messBookingRoutes
  .route("/:bookingId")
  .get(isAuthenticated, hasPermission(PERMISSIONS.BOOKING_VIEW), getBookingById)
  .delete(
    isAuthenticated,
    hasPermission(PERMISSIONS.BOOKING_MANAGE),
    deleteBooking
  );

export default messBookingRoutes;
