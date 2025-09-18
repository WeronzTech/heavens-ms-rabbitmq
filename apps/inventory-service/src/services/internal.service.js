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
