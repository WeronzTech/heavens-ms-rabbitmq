import Inventory from "../models/inventory.model.js";
import Kitchen from "../models/kitchen.model.js";

export const getKitchensAccessibleToProperty = async (data) => {
  try {
    const { propertyId } = data;

    if (!propertyId) {
      return {
        success: false,
        status: 400,
        message: "Property ID is required",
      };
    }

    const accessibleKitchens = await Kitchen.find({
      propertyId: propertyId,
    }).select("_id name propertyId");

    return {
      success: true,
      status: 200,
      message: "Fetched accessible kitchens successfully",
      data: accessibleKitchens,
    };
  } catch (error) {
    console.error("Error fetching accessible kitchens:", error);
    return {
      success: false,
      status: 500,
      message: "Server error while fetching accessible kitchens",
    };
  }
};

export const getInventoryByIdService = async (data) => {
  try {
    const { inventoryId } = data;
    const inventory = await Inventory.findById(inventoryId).select(
      "productName quantityType pricePerUnit totalCost"
    );

    if (!inventory) {
      return {
        success: false,
        status: 404,
        message: "Inventory not found",
        data: null,
      };
    }

    return inventory;
  } catch (err) {
    return {
      success: false,
      status: 500,
      message: err.message,
      data: null,
    };
  }
};
