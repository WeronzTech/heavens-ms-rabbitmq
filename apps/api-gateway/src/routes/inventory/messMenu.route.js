import { Router } from "express";
import {
  createWeeklyMenu,
  updateWeeklyMenu,
  deleteWeeklyMenu,
  getTodaysMenu,
  getWeeklyMenu,
  fetchAllPropertiesBookingTimes,
  getMessMenuByPropertyId,
} from "../../controllers/inventory/messMenu.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const mealRoutes = Router();

mealRoutes.use(isAuthenticated);

// Meal Routes
mealRoutes
  .route("/weekly-menu")
  .post(hasPermission(PERMISSIONS.MENU_MANAGE), createWeeklyMenu) // Create
  .patch(hasPermission(PERMISSIONS.MENU_MANAGE), updateWeeklyMenu)
  .get(hasPermission(PERMISSIONS.MENU_VIEW), getWeeklyMenu) // Get full menu
  .delete(hasPermission(PERMISSIONS.MENU_MANAGE), deleteWeeklyMenu); // Delete menu

mealRoutes
  .route("/todays-menu/:day")
  .get(hasPermission(PERMISSIONS.MENU_VIEW), getTodaysMenu); // Get specific day's menu
mealRoutes
  .route("/todays-menu")
  .get(hasPermission(PERMISSIONS.MENU_VIEW), getTodaysMenu); // Get todays menu

mealRoutes
  .route("/all-properties/booking-times")
  .get(hasPermission(PERMISSIONS.MENU_VIEW), fetchAllPropertiesBookingTimes); // Get all properties and its corresponding booking times

mealRoutes.get(
  "/property-menu",
  hasPermission(PERMISSIONS.MENU_VIEW),
  getMessMenuByPropertyId,
); // Get menu by property id

export default mealRoutes;
