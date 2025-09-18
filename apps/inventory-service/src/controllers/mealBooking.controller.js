import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  // createMealBooking,
  getBookingById,
  getBookingByProperty,
  getUserBookings,
  updateBookingStatus,
  deleteBooking,
  checkNextDayBooking,
} from "../services/mealBooking.service.js";

// createResponder(INVENTORY_PATTERN.BOOKING.CREATE_MEAL_BOOKING, async (data) => {
//   return await createMealBooking(data);
// });

createResponder(INVENTORY_PATTERN.BOOKING.GET_BOOKING_BY_ID, async (data) => {
  return await getBookingById(data);
});

createResponder(
  INVENTORY_PATTERN.BOOKING.GET_BOOKINGS_BY_PROPERTY,
  async (data) => {
    return await getBookingByProperty(data);
  }
);

createResponder(INVENTORY_PATTERN.BOOKING.GET_USER_BOOKINGS, async (data) => {
  return await getUserBookings(data);
});

createResponder(
  INVENTORY_PATTERN.BOOKING.UPDATE_BOOKING_STATUS,
  async (data) => {
    return await updateBookingStatus(data);
  }
);

createResponder(INVENTORY_PATTERN.BOOKING.DELETE_BOOKING, async (data) => {
  return await deleteBooking(data);
});

createResponder(
  INVENTORY_PATTERN.BOOKING.CHECK_NEXT_DAY_BOOKING,
  async (data) => {
    return await checkNextDayBooking(data);
  }
);
