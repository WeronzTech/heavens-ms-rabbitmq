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

const mealRoutes = Router();

// Meal Routes
mealRoutes
  .route("/weekly-menu")
  .post(createWeeklyMenu) // Create
  .patch(updateWeeklyMenu)
  .get(getWeeklyMenu) // Get full menu
  .delete(deleteWeeklyMenu); // Delete menu

mealRoutes.route("/todays-menu/:day").get(getTodaysMenu); // Get specific day's menu
mealRoutes.route("/todays-menu").get(getTodaysMenu); // Get todays menu

mealRoutes
  .route("/all-properties/booking-times")
  .get(fetchAllPropertiesBookingTimes); // Get all properties and its corresponding booking times

mealRoutes.get("/property-menu", isAuthenticated, getMessMenuByPropertyId); // Get menu by property id

export default mealRoutes;
