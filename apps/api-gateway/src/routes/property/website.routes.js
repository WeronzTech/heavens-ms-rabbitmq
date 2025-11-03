import express from "express";
import {
  createWebsitePropertyContent,
  getAllWebsitePropertyContents,
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

// websiteRoutes.put("/:id", updateWebsitePropertyContent);
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

export default websiteRoutes;
