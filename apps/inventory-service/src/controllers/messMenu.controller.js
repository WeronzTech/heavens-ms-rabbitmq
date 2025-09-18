import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../libs/patterns/inventory/inventory.pattern.js";
import {
  createWeeklyMenu,
  deleteWeeklyMenu,
  fetchAllPropertiesBookingTimes,
  getMessMenuByPropertyId,
  getTodaysMenu,
  getWeeklyMenu,
  updateWeeklyMenu,
} from "../services/messMenu.service.js";

createResponder(INVENTORY_PATTERN.MENU.CREATE_WEEKLY_MENU, async (data) => {
  return await createWeeklyMenu(data);
});

createResponder(INVENTORY_PATTERN.MENU.GET_WEEKLY_MENU, async (data) => {
  return await getWeeklyMenu(data);
});

createResponder(INVENTORY_PATTERN.MENU.GET_TODAYS_MENU, async (data) => {
  return await getTodaysMenu(data);
});

createResponder(INVENTORY_PATTERN.MENU.UPDATE_WEEKLY_MENU, async (data) => {
  return await updateWeeklyMenu(data);
});

createResponder(INVENTORY_PATTERN.MENU.DELETE_WEEKLY_MENU, async (data) => {
  return await deleteWeeklyMenu(data);
});

createResponder(INVENTORY_PATTERN.MENU.FETCH_ALL_BOOKING_TIMES, async () => {
  return await fetchAllPropertiesBookingTimes();
});

createResponder(INVENTORY_PATTERN.MENU.GET_MENU_BY_PROPERTY, async (data) => {
  return await getMessMenuByPropertyId(data);
});
