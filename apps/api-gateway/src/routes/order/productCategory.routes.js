import { Router } from "express";
import {
  createProductCategory,
  deleteProductCategory,
  getAllProductCategories,
  getProductCategoryById,
  reorderProductCategories,
  updateProductCategory,
  updateProductCategoryStatus,
} from "../../controllers/order/productCategory.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const categoryRoutes = Router();

categoryRoutes.get("/", getAllProductCategories);
categoryRoutes.get("/:id", getProductCategoryById);

categoryRoutes.use(isAuthenticated);

categoryRoutes.post(
  "/",
  upload.fields([{ name: "categoryImage", maxCount: 1 }]),
  createProductCategory
);
categoryRoutes.put(
  "/:id",
  upload.fields([{ name: "categoryImage", maxCount: 1 }]),
  updateProductCategory
);
categoryRoutes.delete("/:id", deleteProductCategory);
categoryRoutes.patch("/:id/status", updateProductCategoryStatus);
categoryRoutes.post("/reorder", reorderProductCategories);

export default categoryRoutes;
