import { Router } from "express";
import {
  createAssetCategory,
  getAllAssetCategories,
  updateAssetCategory,
  deleteAssetCategory,
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  createMultipleAssets,
  updateAssetStatus,
} from "../../controllers/property/asset.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";
// import { isAuthenticated, hasPermission } from "../../middleware/auth.middleware.js";
// import { PERMISSIONS } from "../../../../../libs/permissions.js";

const assetRoutes = Router();

// Apply authentication to all asset routes
// assetRoutes.use(isAuthenticated);

// --- Asset Category Routes ---
assetRoutes
  .route("/category")
  // .post(hasPermission(PERMISSIONS.PROPERTY_MANAGE), createAssetCategory)
  // .get(hasPermission(PERMISSIONS.PROPERTY_VIEW), getAllAssetCategories);
  .post(createAssetCategory)
  .get(getAllAssetCategories);

assetRoutes
  .route("/category/:id")
  // .put(hasPermission(PERMISSIONS.PROPERTY_MANAGE), updateAssetCategory)
  // .delete(hasPermission(PERMISSIONS.PROPERTY_MANAGE), deleteAssetCategory);
  .put(updateAssetCategory)
  .delete(deleteAssetCategory);

// --- Asset Routes ---
assetRoutes
  .route("/")
  .post(
    // hasPermission(PERMISSIONS.PROPERTY_MANAGE),
    upload.fields([{ name: "invoice", maxCount: 1 }]),
    createAsset
  )
  // .get(hasPermission(PERMISSIONS.PROPERTY_VIEW), getAllAssets);
  .get(getAllAssets);

assetRoutes
  .route("/bulk")
  .post(
    upload.fields([{ name: "invoice", maxCount: 1 }]),
    createMultipleAssets
  );

// New route for updating just the status
assetRoutes.route("/status/:id").patch(updateAssetStatus);

assetRoutes
  .route("/:id")
  // .get(hasPermission(PERMISSIONS.PROPERTY_VIEW), getAssetById)
  .get(getAssetById)
  // .put(
  //   hasPermission(PERMISSIONS.PROPERTY_MANAGE),
  //   upload.fields([{ name: "invoice", maxCount: 1 }]),
  //   updateAsset
  // )
  .put(upload.fields([{ name: "invoice", maxCount: 1 }]), updateAsset)
  // .delete(hasPermission(PERMISSIONS.PROPERTY_MANAGE), deleteAsset);
  .delete(deleteAsset);

export default assetRoutes;
