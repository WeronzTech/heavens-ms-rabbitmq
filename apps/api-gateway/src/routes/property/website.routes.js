import express from "express";
import {
  createCommonMediaContent,
  createWebsitePropertyContent,
  deleteCommonMediaItemsController,
  getAllCommonMedia,
  getAllWebsitePropertyContents,
  getCommonMediaById,
  getWebsitePropertyContentById,
  updateWebsitePropertyContent,
} from "../../controllers/property/website.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const websiteRoutes = express.Router();

websiteRoutes
  .route("/")
  .post(
    upload.fields([
      { name: "images", maxCount: 20 },
      { name: "videos", maxCount: 10 },
    ]),
    createWebsitePropertyContent
  )
  .get(getAllWebsitePropertyContents);

websiteRoutes
  .route("/common")
  .post(
    upload.fields([{ name: "media", maxCount: 30 }]),
    createCommonMediaContent
  )
  .get(getAllCommonMedia);

websiteRoutes
  .route("/:id")
  .put(
    upload.fields([
      { name: "images", maxCount: 20 },
      { name: "videos", maxCount: 10 },
    ]),
    updateWebsitePropertyContent
  )
  .get(getWebsitePropertyContentById);

websiteRoutes
  .route("/common/:id")
  .get(getCommonMediaById)
  .delete(deleteCommonMediaItemsController);

export default websiteRoutes;
