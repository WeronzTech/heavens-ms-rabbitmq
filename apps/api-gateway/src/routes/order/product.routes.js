import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProductsByCategory,
  reorderProducts,
  updateProduct,
} from "../../controllers/order/product.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const productRoutes = Router();

productRoutes.get("/category", getProductsByCategory);
productRoutes.get("/:id", getProductById);
productRoutes.post(
  "/",
  upload.fields([{ name: "productImage", maxCount: 1 }]),
  createProduct
);

productRoutes.use(isAuthenticated);


productRoutes.put(
  "/:id",
  upload.fields([{ name: "productImage", maxCount: 1 }]),
  updateProduct
);
productRoutes.delete("/:id", deleteProduct);
productRoutes.post("/reorder", reorderProducts);

export default productRoutes;
