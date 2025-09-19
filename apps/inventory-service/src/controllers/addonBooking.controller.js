import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  // createAddonBooking,
  // getAddonBookingsByProperty,
  getAddonBookingsForUser,
  getAddonBookingById,
  updateAddonBookingStatus,
} from "../services/addonBooking.service.js";

// createResponder(INVENTORY_PATTERN.ADDON_BOOKING.CREATE, async (data) => {
//   return await createAddonBooking(data);
// });

// createResponder(
//   INVENTORY_PATTERN.ADDON_BOOKING.GET_BY_PROPERTY,
//   async (data) => {
//     return await getAddonBookingsByProperty(data);
//   }
// );

createResponder(INVENTORY_PATTERN.ADDON_BOOKING.GET_FOR_USER, async (data) => {
  return await getAddonBookingsForUser(data);
});

createResponder(INVENTORY_PATTERN.ADDON_BOOKING.GET_BY_ID, async (data) => {
  return await getAddonBookingById(data);
});

createResponder(INVENTORY_PATTERN.ADDON_BOOKING.UPDATE_STATUS, async (data) => {
  return await updateAddonBookingStatus(data);
});
