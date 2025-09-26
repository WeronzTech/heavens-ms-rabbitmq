import { Addon } from "../models/addons.model.js";
import {
  validateAddonData,
  validateMealType,
  validateObjectId,
  validateRequired,
} from "../utils/helpers.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { uploadToFirebase } from "../../../../libs/common/imageOperation.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";

const parseAndValidateData = (data, isUpdate = false) => {
  if (data.price) data.price = parseFloat(data.price);
  if (data.discountedPrice)
    data.discountedPrice = parseFloat(data.discountedPrice);
  if (data.rating) data.rating = parseFloat(data.rating);
  if (typeof data.mealType === "string") {
    data.mealType = data.mealType.split(",").map((s) => s.trim());
  }
  validateAddonData(data, isUpdate);
  return data;
};

export const createAddon = async (data) => {
  try {
    const { itemImage, ...addonData } = data;
    if (!itemImage) {
      return {
        success: false,
        status: 400,
        message: "Item image is required.",
      };
    }

    // Create a file object that uploadToFirebase can use
    const file = {
      buffer: Buffer.from(itemImage.buffer, "base64"),
      originalname: itemImage.originalname,
    };

    const itemImageURL = await uploadToFirebase(file, "addon-images");
    addonData.itemImage = itemImageURL;

    const validatedData = parseAndValidateData(addonData);
    const addon = await Addon.create(validatedData);

    return {
      success: true,
      status: 201,
      message: "Addon created successfully",
      data: addon,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getAllAddons = async (filters) => {
  try {
    const { isAvailable, mealType, kitchenId } = filters;
    validateRequired(kitchenId, "Kitchen ID");
    validateObjectId(kitchenId, "Kitchen ID");

    const query = { kitchenId };
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";
    if (mealType) {
      const mealTypes = Array.isArray(mealType) ? mealType : [mealType];
      mealTypes.forEach(validateMealType);
      query.mealType = { $in: mealTypes };
    }

    const addons = await Addon.find(query).populate("kitchenId itemId").lean();
    return {
      success: true,
      status: 200,
      message: "Addons retrieved successfully",
      data: addons,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getAddonById = async ({ addonId }) => {
  try {
    validateObjectId(addonId, "Addon ID");
    const addon = await Addon.findById(addonId)
      .populate("kitchenId itemId")
      .lean();
    if (!addon) {
      return { success: false, status: 404, message: "Addon not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Addon retrieved successfully",
      data: addon,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const updateAddon = async (data) => {
  try {
    const { addonId, itemImage, ...updateData } = data;
    validateObjectId(addonId, "Addon ID");

    if (itemImage) {
      const file = {
        buffer: Buffer.from(itemImage.buffer, "base64"),
        originalname: itemImage.originalname,
      };
      const itemImageURL = await uploadToFirebase(file, "addon-images");
      updateData.itemImage = itemImageURL;
    }

    const validatedData = parseAndValidateData(updateData, true);
    const updatedAddon = await Addon.findByIdAndUpdate(addonId, validatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedAddon) {
      return { success: false, status: 404, message: "Addon not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Addon updated successfully",
      data: updatedAddon,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const updateAddonAvailability = async ({ addonId, isAvailable }) => {
  try {
    validateObjectId(addonId, "Addon ID");
    if (typeof isAvailable !== "boolean") {
      return {
        success: false,
        status: 400,
        message: "isAvailable must be a boolean value",
      };
    }
    const updatedAddon = await Addon.findByIdAndUpdate(
      addonId,
      { $set: { isAvailable } },
      { new: true }
    );
    if (!updatedAddon) {
      return { success: false, status: 404, message: "Addon not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Addon availability updated",
      data: updatedAddon,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const deleteAddon = async ({ addonId }) => {
  try {
    validateObjectId(addonId, "Addon ID");
    const deletedAddon = await Addon.findByIdAndDelete(addonId);
    if (!deletedAddon) {
      return { success: false, status: 404, message: "Addon not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Addon deleted successfully",
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getAddonByPropertyId = async ({ userId }) => {
  try {
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      { userId }
    );
    if (!userResponse.body.success) {
      return { success: false, status: 404, message: "User not found" };
    }
    const user = userResponse.body.data;

    const propertyResponse = await sendRPCRequest(
      PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
      { propertyId: user?.stayDetails?.propertyId }
    );
    if (!propertyResponse.success) {
      return { success: false, status: 404, message: "Property not found" };
    }
    const property = propertyResponse.data;

    const addons = await Addon.find({ kitchenId: property.kitchenId }).populate(
      { path: "itemId", model: "Recipe", select: "name veg" }
    );
    return {
      success: true,
      status: 200,
      message: "Addons retrieved successfully",
      data: addons,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};
