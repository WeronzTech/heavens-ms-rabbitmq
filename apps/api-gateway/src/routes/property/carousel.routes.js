// src/routes/carousel.routes.js
import express from "express";
import {
  addCarouselImagesController,
  deleteCarouselController,
  getAllCarouselController,
  updateCarouselImagesController,
} from "../../controllers/property/carousal.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { upload } from "../../../../../libs/common/imageOperation.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const carouselRoutes = express.Router();

carouselRoutes.use(isAuthenticated);

carouselRoutes.post(
  "/add",
  hasPermission(PERMISSIONS.CAROUSEL_MANAGE),
  upload.single("file"),
  addCarouselImagesController,
);
carouselRoutes.get(
  "/get",
  hasPermission(PERMISSIONS.CAROUSEL_MANAGE),
  getAllCarouselController,
);

carouselRoutes.put(
  "/update/:id",
  hasPermission(PERMISSIONS.CAROUSEL_MANAGE),
  upload.single("file"),
  updateCarouselImagesController,
);
carouselRoutes.delete(
  "/delete/:id",
  hasPermission(PERMISSIONS.CAROUSEL_MANAGE),
  deleteCarouselController,
);

export default carouselRoutes;
