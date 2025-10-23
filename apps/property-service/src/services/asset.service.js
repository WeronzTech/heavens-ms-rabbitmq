import mongoose from "mongoose";
import { Asset } from "../models/assets.model.js";
import { AssetCategory } from "../models/assetCategorys.model.js";
import {
  uploadToFirebase,
  deleteFromFirebase,
} from "../../../../libs/common/imageOperation.js";

// --- Asset Category Services ---

export const createAssetCategory = async (data) => {
  try {
    const { name, description } = data;
    const existing = await AssetCategory.findOne({ name });
    if (existing) {
      return {
        success: false,
        status: 409,
        message: "An asset category with this name already exists.",
      };
    }
    const newCategory = await AssetCategory.create({ name, description });
    return {
      success: true,
      status: 201,
      message: "Asset category created successfully.",
      data: newCategory,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getAllAssetCategories = async () => {
  try {
    const categories = await AssetCategory.find().sort({ name: 1 });
    return {
      success: true,
      status: 200,
      message: "Asset categories retrieved successfully.",
      data: categories,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const updateAssetCategory = async (data) => {
  try {
    const { id, name, description } = data;
    const updatedCategory = await AssetCategory.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );
    if (!updatedCategory) {
      return {
        success: false,
        status: 404,
        message: "Asset category not found.",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Asset category updated successfully.",
      data: updatedCategory,
    };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        status: 409,
        message: "An asset category with this name already exists.",
      };
    }
    return { success: false, status: 500, message: error.message };
  }
};

export const deleteAssetCategory = async (data) => {
  try {
    const { id } = data;
    // Check if any assets are using this category
    const assetCount = await Asset.countDocuments({ categoryId: id });
    if (assetCount > 0) {
      return {
        success: false,
        status: 400,
        message: `Cannot delete category. It is currently associated with ${assetCount} asset(s).`,
      };
    }
    const deletedCategory = await AssetCategory.findByIdAndDelete(id);
    if (!deletedCategory) {
      return {
        success: false,
        status: 404,
        message: "Asset category not found.",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Asset category deleted successfully.",
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

// --- Asset Services ---

export const createAsset = async (data) => {
  try {
    const { payload, files } = data;
    const assetData = { ...payload };

    if (files && files.invoice) {
      const invoiceFile = {
        buffer: Buffer.from(files.invoice.buffer, "base64"),
        originalname: files.invoice.originalname,
      };
      const invoiceUrl = await uploadToFirebase(invoiceFile, "asset-invoices");
      assetData.purchaseDetails.invoiceUrl = invoiceUrl;
    }

    const newAsset = await Asset.create(assetData);
    return {
      success: true,
      status: 201,
      message: "Asset created successfully.",
      data: newAsset,
    };
  } catch (error) {
    return { success: false, status: 400, message: error.message };
  }
};

export const createMultipleAssets = async (data) => {
  try {
    const { payload, files, count } = data;
    const assetData = { ...payload };
    let invoiceUrl = null;

    if (files && files.invoice) {
      const invoiceFile = {
        buffer: Buffer.from(files.invoice.buffer, "base64"),
        originalname: files.invoice.originalname,
      };
      invoiceUrl = await uploadToFirebase(invoiceFile, "asset-invoices");
    }

    if (invoiceUrl) {
      if (!assetData.purchaseDetails) assetData.purchaseDetails = {};
      assetData.purchaseDetails.invoiceUrl = invoiceUrl;
    }

    const assetPromises = [];
    for (let i = 0; i < count; i++) {
      // We call Asset.create() in a loop to ensure the 'pre-save' hook
      // for generating unique assetId is triggered for every single asset.
      // Using insertMany() would bypass this hook.
      assetPromises.push(Asset.create(assetData));
    }

    const createdAssets = await Promise.all(assetPromises);

    return {
      success: true,
      status: 201,
      message: `${count} assets created successfully.`,
      data: createdAssets,
    };
  } catch (error) {
    return { success: false, status: 400, message: error.message };
  }
};

export const getAllAssets = async (filters) => {
  try {
    const { propertyId, floorId, roomId, categoryId, status } = filters;
    const query = {};

    if (propertyId) query.propertyId = propertyId;
    if (floorId) query.floorId = floorId;
    if (roomId) query.roomId = roomId;
    if (categoryId) query.categoryId = categoryId;
    if (status) query.status = status;

    const assets = await Asset.find(query)
      .populate("categoryId", "name")
      .populate("propertyId", "propertyName")
      .populate("roomId", "roomNo")
      .sort({ createdAt: -1 });

    return {
      success: true,
      status: 200,
      message: "Assets retrieved successfully.",
      data: assets,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getAssetById = async (data) => {
  try {
    const { id } = data;
    const asset = await Asset.findById(id)
      .populate("categoryId", "name")
      .populate("propertyId", "propertyName")
      .populate("roomId", "roomNo");

    if (!asset) {
      return { success: false, status: 404, message: "Asset not found." };
    }
    return {
      success: true,
      status: 200,
      message: "Asset retrieved successfully.",
      data: asset,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const updateAsset = async (data) => {
  try {
    const { id, payload, files } = data;
    const assetData = { ...payload };

    const asset = await Asset.findById(id);
    if (!asset) {
      return { success: false, status: 404, message: "Asset not found." };
    }

    if (files && files.invoice) {
      // Delete old invoice if it exists
      if (asset.purchaseDetails?.invoiceUrl) {
        await deleteFromFirebase(asset.purchaseDetails.invoiceUrl);
      }
      // Upload new one
      const invoiceFile = {
        buffer: Buffer.from(files.invoice.buffer, "base64"),
        originalname: files.invoice.originalname,
      };
      const invoiceUrl = await uploadToFirebase(invoiceFile, "asset-invoices");

      // Deep-set the nested property
      if (!assetData.purchaseDetails) assetData.purchaseDetails = {};
      assetData.purchaseDetails.invoiceUrl = invoiceUrl;
    }

    const updatedAsset = await Asset.findByIdAndUpdate(id, assetData, {
      new: true,
      runValidators: true,
    });

    return {
      success: true,
      status: 200,
      message: "Asset updated successfully.",
      data: updatedAsset,
    };
  } catch (error) {
    return { success: false, status: 400, message: error.message };
  }
};

export const deleteAsset = async (data) => {
  try {
    const { id } = data;
    const deletedAsset = await Asset.findByIdAndDelete(id);

    if (!deletedAsset) {
      return { success: false, status: 404, message: "Asset not found." };
    }

    // Delete invoice from Firebase if it exists
    if (deletedAsset.purchaseDetails?.invoiceUrl) {
      await deleteFromFirebase(deletedAsset.purchaseDetails.invoiceUrl);
    }

    return {
      success: true,
      status: 200,
      message: "Asset deleted successfully.",
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const updateAssetStatus = async (data) => {
  try {
    const { id, status, soldDetails } = data;
    if (!status) {
      return { success: false, status: 400, message: "Status is required." };
    }

    const update = { status };
    if (status === "Sold" && soldDetails) {
      update.soldDetails = soldDetails;
    }

    const updatedAsset = await Asset.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!updatedAsset) {
      return { success: false, status: 404, message: "Asset not found." };
    }

    return {
      success: true,
      status: 200,
      message: "Asset status updated successfully.",
      data: updatedAsset,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};
