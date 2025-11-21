import { Router } from "express";
import {
  createBusinessCategory,
  deleteBusinessCategory,
  getAllBusinessCategories,
  getBusinessCategoryById,
  updateBusinessCategory,
  updateBusinessCategoryStatus,
} from "../../controllers/order/businessCategory.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const busCategoryRoutes = Router();

busCategoryRoutes.get("/", getAllBusinessCategories);
busCategoryRoutes.get("/:id", getBusinessCategoryById);

busCategoryRoutes.use(isAuthenticated);

busCategoryRoutes.post(
  "/",
  upload.fields([{ name: "bannerImage", maxCount: 1 }]),
  createBusinessCategory
);
busCategoryRoutes.put(
  "/:id",
  upload.fields([{ name: "bannerImage", maxCount: 1 }]),
  updateBusinessCategory
);
busCategoryRoutes.delete("/:id", deleteBusinessCategory);
busCategoryRoutes.patch("/:id/status", updateBusinessCategoryStatus);

export default busCategoryRoutes;
