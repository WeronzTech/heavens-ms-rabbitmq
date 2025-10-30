import mongoose from "mongoose";
import { Asset } from "../models/assets.model.js";
import { AssetCategory } from "../models/assetCategorys.model.js";
import {
  uploadToFirebase,
  deleteFromFirebase,
} from "../../../../libs/common/imageOperation.js";
import PDFDocument from "pdfkit";

const generateLabelsPDF = (assets) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4", // Standard paper size
        margins: { top: 36, bottom: 36, left: 36, right: 36 }, // Approx 0.5 inch margins
      });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // --- Label Grid Settings ---
      const pageMargin = 36;
      const pageWidth = doc.page.width - pageMargin * 2;
      const pageHeight = doc.page.height - pageMargin * 2;
      const cols = 3;
      const rows = 10;
      const labelWidth = pageWidth / cols;
      const labelHeight = pageHeight / rows;
      let currentX = pageMargin;
      let currentY = pageMargin;
      let item = 0;

      for (const asset of assets) {
        if (item > 0 && item % (cols * rows) === 0) {
          doc.addPage();
          currentX = pageMargin;
          currentY = pageMargin;
        }

        const colIndex = item % cols;
        const rowIndex = Math.floor(item / cols) % rows;

        currentX = pageMargin + colIndex * labelWidth;
        currentY = pageMargin + rowIndex * labelHeight;

        // Draw a border for the label (for easy cutting)
        doc.rect(currentX, currentY, labelWidth, labelHeight).stroke();

        // Center text within the label
        doc.font("Helvetica-Bold").fontSize(12);
        doc.text(asset.name, currentX, currentY + labelHeight / 2 - 10, {
          width: labelWidth,
          align: "center",
        });

        doc.font("Helvetica").fontSize(10);
        doc.text(asset.assetId, currentX, currentY + labelHeight / 2 + 5, {
          width: labelWidth,
          align: "center",
        });

        item++;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

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
    // console.log("files", files)
    const assetData = { ...payload };
    // console.log("data", data)

    // console.log("assetData",assetData )

    if (assetData.files && assetData.files.invoice) {
      const invoiceFile = {
        buffer: Buffer.from(assetData.files.invoice.buffer, "base64"),
        originalname: assetData.files.invoice.originalname,
      };
      const invoiceUrl = await uploadToFirebase(invoiceFile, "asset-invoices");
      assetData.purchaseDetails.invoiceUrl = invoiceUrl;
      console.log("INvoice", invoiceUrl);
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

    if (assetData.files && assetData.files.invoice) {
      const invoiceFile = {
        buffer: Buffer.from(assetData.files.invoice.buffer, "base64"),
        originalname: assetData.files.invoice.originalname,
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
    console.log("dataa", data);
    const assetData = { ...payload };

    console.log("Asset data", assetData);

    const asset = await Asset.findById(id);
    if (!asset) {
      return { success: false, status: 404, message: "Asset not found." };
    }

    if (assetData.files && assetData.files.invoice) {
      console.log("Here--------------");
      // Delete old invoice if it exists
      if (asset.purchaseDetails?.invoiceUrl) {
        await deleteFromFirebase(asset.purchaseDetails.invoiceUrl);
      }
      // Upload new one
      const invoiceFile = {
        buffer: Buffer.from(assetData.files.invoice.buffer, "base64"),
        originalname: assetData.files.invoice.originalname,
      };
      console.log("invoiceFile", invoiceFile);
      const invoiceUrl = await uploadToFirebase(invoiceFile, "asset-invoices");

      // Deep-set the nested property
      if (!assetData.purchaseDetails) assetData.purchaseDetails = {};
      assetData.payload.purchaseDetails.invoiceUrl = invoiceUrl;
    }

    const updatedAsset = await Asset.findByIdAndUpdate(id, assetData.payload, {
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

export const getAssetLabelsPDF = async (filters) => {
  try {
    const { propertyId, floorId, roomId } = filters;
    const query = {};

    if (propertyId) query.propertyId = propertyId;
    if (floorId) query.floorId = floorId;
    if (roomId) query.roomId = roomId;

    const assets = await Asset.find(query)
      .select("name assetId") // Only fetch the fields we need
      .sort({ name: 1 })
      .lean();

    if (assets.length === 0) {
      return {
        success: false,
        status: 404,
        message: "No assets found matching the specified filters.",
      };
    }

    const pdfBuffer = await generateLabelsPDF(assets);

    return {
      success: true,
      status: 200,
      message: "Asset labels PDF generated successfully.",
      data: pdfBuffer,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="asset-labels.pdf"',
      },
    };
  } catch (error) {
    console.error("Error generating asset labels PDF:", error);
    return { success: false, status: 500, message: error.message };
  }
};
