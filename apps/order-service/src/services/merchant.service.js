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
    const { shopOwnerId, ...merchantData } = data;
    
    console.log("Received data for merchant creation:", { shopOwnerId, merchantData });

    // Check if shopOwnerId is provided
    if (!shopOwnerId) {
      return {
        status: 400,
        message: "shopOwnerId is required",
      };
    }

    // Handle Image Uploads if files are provided
    let imageUrls = {};
    if (data.file) {
      imageUrls = await handleMerchantImages(data.file);
    }

    // Merge all data - ensure merchantDetail is properly structured
    const finalMerchantDetail = {
      ...merchantData, // This should contain all the merchantDetail fields
      ...imageUrls,
    };

    console.log("Creating merchant with data:", {
      shopOwnerId,
      merchantDetail: finalMerchantDetail
    });

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

export const updateMerchant = async (data) => {
  try {
    const { merchantId, merchantDetail, file } = data;

    console.log("Update Merchant - Received data:", { merchantId, merchantDetail, file });

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return { status: 404, message: "Merchant not found" };
    }

    // Handle Image Uploads
    const imageUpdates = await handleMerchantImages(file, merchant.merchantDetail);

    // CORRECTED: Properly merge the updates - ensure all fields are included
    const updatedDetail = {
      ...merchant.merchantDetail.toObject(), // Keep existing data
    };

    // Update only the fields that are provided in merchantDetail
    if (merchantDetail) {
      Object.keys(merchantDetail).forEach(key => {
        if (merchantDetail[key] !== null && merchantDetail[key] !== undefined && merchantDetail[key] !== "") {
          updatedDetail[key] = merchantDetail[key];
        }
      });
    }

    // Add image updates
    Object.keys(imageUpdates).forEach(key => {
      if (imageUpdates[key]) {
        updatedDetail[key] = imageUpdates[key];
      }
    });

    console.log("Update Merchant - Final updated detail:", updatedDetail);

    // Update the merchant
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

    const merchants = await Merchant.find({ shopOwnerId }).populate({
      path: "merchantDetail.businessCategoryId",
      select: "title",
    });

    if (!merchants || merchants.length === 0) {
      return { status: 404, message: "No merchants found for this owner" };
    }

    return { status: 200, data: { merchants } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const getMerchantById = async (data) => {
  try {
    const { merchantId } = data;
    const merchant = await Merchant.findById(merchantId).populate({
      path: "merchantDetail.businessCategoryId",
      select: "title",
    });

    if (!merchant) {
      return { status: 404, message: "Merchant not found" };
    }

    return { status: 200, data: { merchant } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateShopStatus = async ( data ) => {
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
