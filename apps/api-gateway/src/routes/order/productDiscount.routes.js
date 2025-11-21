import { Router } from "express";
import {
  createProductDiscount,
  deleteProductDiscount,
  getAllProductDiscounts,
  getProductDiscountById,
  updateProductDiscount,
  updateProductDiscountStatus,
} from "../../controllers/order/productDiscount.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";

const productDiscountRoutes = Router();

productDiscountRoutes.get("/", getAllProductDiscounts);
productDiscountRoutes.get("/:id", getProductDiscountById);

productDiscountRoutes.use(isAuthenticated);
productDiscountRoutes.post("/", createProductDiscount);
productDiscountRoutes.put("/:id", updateProductDiscount);
productDiscountRoutes.patch("/:id/status", updateProductDiscountStatus);
productDiscountRoutes.delete("/:id", deleteProductDiscount);

export default productDiscountRoutes;
