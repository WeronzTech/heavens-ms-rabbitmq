// src/routes/carousel.routes.js
import express from "express";
import { addCarouselImagesController, deleteCarouselController, updateCarouselImagesController } from "../../controllers/property/carousal.controller.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const carouselRoutes = express.Router();

carouselRoutes.post(
  "/add",
  isAuthenticated,
  upload.single("file"),
  addCarouselImagesController
);
carouselRoutes.put(
    "/update/:id",
    isAuthenticated,
    upload.single("file"),
    updateCarouselImagesController
  );
  carouselRoutes.delete(
    "/delete/:id",
    isAuthenticated,
    deleteCarouselController
  ); 
export default carouselRoutes;
