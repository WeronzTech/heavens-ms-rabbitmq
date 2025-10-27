import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
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
  getAssetLabelsPDF,
} from "../services/asset.service.js";

// --- Asset Category Responders ---

createResponder(PROPERTY_PATTERN.ASSET_CATEGORY.CREATE, createAssetCategory);
createResponder(PROPERTY_PATTERN.ASSET_CATEGORY.GET_ALL, getAllAssetCategories);
createResponder(PROPERTY_PATTERN.ASSET_CATEGORY.UPDATE, updateAssetCategory);
createResponder(PROPERTY_PATTERN.ASSET_CATEGORY.DELETE, deleteAssetCategory);

// --- Asset Responders ---

createResponder(PROPERTY_PATTERN.ASSET.CREATE, createAsset);
createResponder(PROPERTY_PATTERN.ASSET.CREATE_BULK, createMultipleAssets);
createResponder(PROPERTY_PATTERN.ASSET.GET_ALL, getAllAssets);
createResponder(PROPERTY_PATTERN.ASSET.GET_BY_ID, getAssetById);
createResponder(PROPERTY_PATTERN.ASSET.UPDATE, updateAsset);
createResponder(PROPERTY_PATTERN.ASSET.UPDATE_STATUS, updateAssetStatus);
createResponder(PROPERTY_PATTERN.ASSET.DELETE, deleteAsset);
createResponder(PROPERTY_PATTERN.ASSET.GET_ASSET_LABELS, getAssetLabelsPDF);
