import { Router } from "express";
import {
  createMealBooking,
  deleteBooking,
  getBookingById,
  getBookingByProperty,
  getUserBookings,
  updateBookingStatus,
  checkNextDayBooking,
} from "../../controllers/inventory/mealBooking.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";

const messBookingRoutes = Router();

messBookingRoutes
  .route("/check-booking")
  .get(isAuthenticated, checkNextDayBooking);

messBookingRoutes.route("/").post(isAuthenticated, createMealBooking);

messBookingRoutes.route("/property").get(isAuthenticated, getBookingByProperty);

messBookingRoutes
  .route("/:bookingId")
  .get(isAuthenticated, getBookingById)
  .delete(isAuthenticated, deleteBooking);

messBookingRoutes.route("/user/:userId").get(isAuthenticated, getUserBookings);

messBookingRoutes
  .route("/:bookingId/status")
  .patch(isAuthenticated, updateBookingStatus);

export default messBookingRoutes;
