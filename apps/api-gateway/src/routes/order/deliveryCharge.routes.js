import { Router } from "express";
import {
  createDeliveryCharge,
  deleteDeliveryCharge,
  getDeliveryChargeByMerchant,
  updateDeliveryCharge,
} from "../../controllers/order/deliveryCharge.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";

const deliveryChargeRoutes = Router();

deliveryChargeRoutes.get("/merchant/:merchantId", getDeliveryChargeByMerchant);

deliveryChargeRoutes.use(isAuthenticated);
deliveryChargeRoutes.post("/", createDeliveryCharge);
deliveryChargeRoutes.put("/:id", updateDeliveryCharge);
deliveryChargeRoutes.delete("/:id", deleteDeliveryCharge);

export default deliveryChargeRoutes;
