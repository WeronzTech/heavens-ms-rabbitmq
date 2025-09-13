import axios from "axios";

export const getAccessibleKitchens = async (propertyId) => {
  try {
    const response = await axios.get(
      `${process.env.INVENTORY_SERVICE_URL}/api/v2/inventory/internal/kitchens/accessible`,
      {
        params: {propertyId},
        headers: {
          "x-internal-key": process.env.INTERNAL_SECRET_KEY,
        },
        timeout: 5000, // 5 second timeout
      }
    );

    return response.data.data || [];
  } catch (error) {
    console.error("Inventory service error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Status code:", error.response.status);
    }
    return [];
  }
};
