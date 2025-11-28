import { Router } from "express";
import {
  createOrder,
  getOrderById,
  getOrdersByCustomer,
  getOrdersByMerchant,
  updateOrderStatus,
  verifyPayment,
} from "../../controllers/order/order.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";

const orderRoutes = Router();

orderRoutes.post("/", createOrder);
orderRoutes.post("/verify-payment", verifyPayment);
orderRoutes.get("/my-orders", getOrdersByCustomer);
orderRoutes.get("/merchant-order/:merchantId", getOrdersByMerchant);
orderRoutes.get("/:id", getOrderById);
orderRoutes.put("/:id/status", updateOrderStatus);

orderRoutes.use(isAuthenticated);




export default orderRoutes;
