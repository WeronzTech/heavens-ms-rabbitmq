import { Router } from "express";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { upload } from "../../../../../libs/common/imageOperation.js"; // Adjust path if needed
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";
import {
  createGamingItem,
  deleteGamingItem,
  getAllGamingItems,
  getAllOrders,
  getGamingItemById,
  getOrderById,
  initiateOrder,
  updateGamingItem,
  updateGamingItemStatus,
  updateOrderStatus,
  verifyAndConfirmOrder,
} from "../../controllers/user/gaming.controller.js";

const gamingRoutes = Router();

// Apply authentication middleware to all routes in this file
gamingRoutes.use(isAuthenticated);

// --- GAMING ITEM ROUTES ---
gamingRoutes
  .route("/items")
  .post(
    hasPermission(PERMISSIONS.GAMING_ITEM_MANAGE),
    upload.fields([{ name: "itemImage", maxCount: 1 }]),
    createGamingItem
  )
  .get(hasPermission(PERMISSIONS.GAMING_ITEM_VIEW), getAllGamingItems);

gamingRoutes
  .route("/items/:itemId")
  .get(hasPermission(PERMISSIONS.GAMING_ITEM_VIEW), getGamingItemById)
  .patch(
    hasPermission(PERMISSIONS.GAMING_ITEM_MANAGE),
    upload.fields([{ name: "itemImage", maxCount: 1 }]),
    updateGamingItem
  )
  .delete(hasPermission(PERMISSIONS.GAMING_ITEM_MANAGE), deleteGamingItem);

gamingRoutes
  .route("/items/status/:itemId")
  .patch(hasPermission(PERMISSIONS.GAMING_ITEM_MANAGE), updateGamingItemStatus);

// --- GAMING ORDER & PAYMENT ROUTES ---
gamingRoutes
  .route("/orders")
  .get(hasPermission(PERMISSIONS.GAMING_ORDER_VIEW), getAllOrders);

gamingRoutes
  .route("/orders/:orderId")
  .get(hasPermission(PERMISSIONS.GAMING_ORDER_VIEW), getOrderById);

gamingRoutes
  .route("/orders/status/:orderId")
  .patch(hasPermission(PERMISSIONS.GAMING_ORDER_MANAGE), updateOrderStatus);

// Renamed endpoints for clarity in the payment flow
gamingRoutes.post("/orders/initiate", initiateOrder);
gamingRoutes.post("/orders/confirm", verifyAndConfirmOrder);

export default gamingRoutes;
