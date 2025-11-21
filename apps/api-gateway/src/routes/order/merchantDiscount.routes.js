import { Router } from "express";
import {
  createMerchantDiscount,
  deleteMerchantDiscount,
  getAllMerchantDiscounts,
  getMerchantDiscountById,
  updateMerchantDiscount,
  updateMerchantDiscountStatus,
} from "../../controllers/order/merchantDiscount.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";

const merchantDiscountRoutes = Router();

merchantDiscountRoutes.get("/", getAllMerchantDiscounts);
merchantDiscountRoutes.get("/:id", getMerchantDiscountById);

merchantDiscountRoutes.use(isAuthenticated);
merchantDiscountRoutes.post("/", createMerchantDiscount);
merchantDiscountRoutes.put("/:id", updateMerchantDiscount);
merchantDiscountRoutes.patch("/:id/status", updateMerchantDiscountStatus);
merchantDiscountRoutes.delete("/:id", deleteMerchantDiscount);

export default merchantDiscountRoutes;
