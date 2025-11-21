import Merchant from "../models/merchant.model.js";
import {
  uploadToFirebase,
  deleteFromFirebase,
} from "../../../../libs/common/imageOperation.js";

// Helper to handle multiple image uploads
const handleMerchantImages = async (file, existingDetails = {}) => {
  const updates = {};
  const imageFields = [
    { key: "merchantImage", urlKey: "merchantImageURL" },
    { key: "pancardImage", urlKey: "pancardImageURL" },
    { key: "GSTINImage", urlKey: "GSTINImageURL" },
    { key: "FSSAIImage", urlKey: "FSSAIImageURL" },
    { key: "aadharImage", urlKey: "aadharImageURL" },
  ];

  for (const field of imageFields) {
    if (file?.[field.key] && file?.[field.key][0]?.buffer) {
      // Upload new image
      const imageFile = {
        buffer: Buffer.from(file[field.key][0].buffer, "base64"),
        mimetype: file[field.key][0].mimetype,
        originalname: file[field.key][0].originalname,
      };
      updates[field.urlKey] = await uploadToFirebase(imageFile, "merchants");

      // Delete old image if it exists
      if (existingDetails[field.urlKey]) {
        await deleteFromFirebase(existingDetails[field.urlKey]);
      }
    }
  }
  return updates;
};

export const addMerchantDetails = async (data) => {
  try {
    const { shopOwnerId, merchantDetail, file } = data;

    // Check if merchant already exists for this shop owner
    const existingMerchant = await Merchant.findOne({ shopOwnerId });
    if (existingMerchant) {
      return {
        status: 400,
        message: "Merchant already exists for this Shop Owner",
      };
    }

    // Handle Image Uploads
    const imageUrls = await handleMerchantImages(file);

    // Merge image URLs into merchantDetail
    const finalMerchantDetail = {
      ...merchantDetail,
      ...imageUrls,
    };

    const newMerchant = await Merchant.create({
      shopOwnerId,
      merchantDetail: finalMerchantDetail,
      role: "Merchant",
      isApproved: "Pending",
    });

    return {
      status: 201,
      data: {
        message: "Merchant details added successfully",
        merchant: newMerchant,
      },
    };
  } catch (error) {
    console.error("RPC Add Merchant Details Error:", error);
    return { status: 500, message: error.message };
  }
};

export const approveMerchant = async ({ data }) => {
  try {
    const { merchantId, status } = data; // status should be 'Approved'

    const merchant = await Merchant.findByIdAndUpdate(
      merchantId,
      { isApproved: status },
      { new: true }
    );

    if (!merchant) {
      return { status: 404, message: "Merchant not found" };
    }

    return {
      status: 200,
      data: { message: `Merchant ${status} successfully`, merchant },
    };
  } catch (error) {
    console.error("RPC Approve Merchant Error:", error);
    return { status: 500, message: error.message };
  }
};

export const blockMerchant = async ({ data }) => {
  try {
    const { merchantId, isBlocked, reason } = data;

    const updateData = {
      isBlocked,
      reasonForBlockingOrDeleting: isBlocked ? reason : null,
      blockedDate: isBlocked ? new Date() : null,
      // If blocked, force close the shop
      ...(isBlocked && { openedToday: false, status: false }),
    };

    const merchant = await Merchant.findByIdAndUpdate(merchantId, updateData, {
      new: true,
    });

    if (!merchant) {
      return { status: 404, message: "Merchant not found" };
    }

    return {
      status: 200,
      data: {
        message: isBlocked
          ? "Merchant blocked successfully"
          : "Merchant unblocked",
        merchant,
      },
    };
  } catch (error) {
    console.error("RPC Block Merchant Error:", error);
    return { status: 500, message: error.message };
  }
};

export const updateMerchant = async ({ data }) => {
  try {
    const { merchantId, merchantDetail, file } = data;

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return { status: 404, message: "Merchant not found" };
    }

    // Handle Image Uploads (Pass existing details to delete old images)
    const imageUpdates = await handleMerchantImages(
      file,
      merchant.merchantDetail
    );

    // Merge updates: Keep existing details, overwrite with new text data, then overwrite with new images
    const updatedDetail = {
      ...merchant.merchantDetail.toObject(), // Convert Mongoose subdoc to object
      ...merchantDetail,
      ...imageUpdates,
    };

    merchant.merchantDetail = updatedDetail;
    await merchant.save();

    return {
      status: 200,
      data: { message: "Merchant updated successfully", merchant },
    };
  } catch (error) {
    console.error("RPC Update Merchant Error:", error);
    return { status: 500, message: error.message };
  }
};

export const deleteMerchant = async ({ data }) => {
  try {
    const { merchantId } = data;
    const merchant = await Merchant.findByIdAndDelete(merchantId);

    if (!merchant) {
      return { status: 404, message: "Merchant not found" };
    }

    // Cleanup images
    const details = merchant.merchantDetail || {};
    const imagesToDelete = [
      details.merchantImageURL,
      details.pancardImageURL,
      details.GSTINImageURL,
      details.FSSAIImageURL,
      details.aadharImageURL,
    ];

    for (const url of imagesToDelete) {
      if (url) await deleteFromFirebase(url);
    }

    return { status: 200, data: { message: "Merchant deleted successfully" } };
  } catch (error) {
    console.error("RPC Delete Merchant Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getMerchantByShopOwnerId = async (data) => {
  try {
    const { shopOwnerId } = data;
    const merchant = await Merchant.findOne({ shopOwnerId });

    if (!merchant) {
      return { status: 404, message: "Merchant not found for this owner" };
    }

    return { status: 200, data: { merchant } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const getMerchantById = async ({ data }) => {
  try {
    const { merchantId } = data;
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return { status: 404, message: "Merchant not found" };
    }

    return { status: 200, data: { merchant } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateShopStatus = async ({ data }) => {
  try {
    const { merchantId, isOpen } = data; // Boolean: true for Open, false for Closed

    const merchant = await Merchant.findByIdAndUpdate(
      merchantId,
      {
        openedToday: isOpen,
        status: isOpen, // Syncing status with openedToday as per common logic
        statusManualToggle: isOpen,
      },
      { new: true }
    );

    if (!merchant) {
      return { status: 404, message: "Merchant not found" };
    }

    return {
      status: 200,
      data: {
        message: `Shop is now ${isOpen ? "Open" : "Closed"}`,
        merchant,
      },
    };
  } catch (error) {
    console.error("RPC Update Shop Status Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getAllMerchants = async (data) => {
  try {
    const { status, isApproved, page = 1, limit = 10, propertyId } = data;
    const query = {};

    if (status !== undefined) query.status = status;
    if (isApproved) query.isApproved = isApproved;
    if (propertyId) query["merchantDetail.propertyId"] = propertyId;

    const merchants = await Merchant.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Merchant.countDocuments(query);

    return {
      status: 200,
      data: {
        merchants,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const getMerchantsByBusinessCategory = async ({ data }) => {
  try {
    const { businessCategoryId, page = 1, limit = 10 } = data;

    // Check if merchants contain the category ID in their array
    const query = {
      "merchantDetail.businessCategoryId": businessCategoryId,
    };

    const merchants = await Merchant.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Merchant.countDocuments(query);

    return {
      status: 200,
      data: {
        merchants,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("RPC Get Merchants By Category Error:", error);
    return { status: 500, message: error.message };
  }
};
