import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

export const createProperty = async (req, res) => {
    const {
        state,
        city,
        location,
        branch,
        phase,
        propertyName,
        sharingPrices,
        deposit,
        kitchenId,
        images,
        adminName,
        clientId,
        ...rest } = req.body;
    // console.log("create");
    const response = await sendRPCRequest(PROPERTY_PATTERN.PROPERTY.CREATE_PROPERTY, {
        state,
        city,
        location,
        branch,
        phase,
        propertyName,
        sharingPrices,
        deposit,
        kitchenId,
        images,
        adminName,
        clientId,
        ...rest
    });
    console.log(response)
  
    if (response.status === 200) {
      return res.status(200).json(response?.data);
    } else {
      return res.status(response?.status).json({ message: response.message });
    }
  };


  export const updateProperty = async (req, res) => {
    try {
      const { id } = req.params; // ✅ Extract ID from URL
      const body = req.body;
  
      console.log("🔄 Update property request received for ID:", id);
  
      // Pass both id and body to service through RPC
      const response = await sendRPCRequest(PROPERTY_PATTERN.PROPERTY.UPDATE_PROPERTY, {
        id,
        ...body,
      });
  
      return res.status(response?.status || 500).json(response);
    } catch (error) {
      console.error("Update Property Controller Error:", error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: "Unexpected error while updating property",
        error: error.message,
      });
    }
  };
  export const deleteProperty = async (req, res) => {
    try {
      const { id } = req.params;
  
      console.log("🗑️ Delete property request received for ID:", id);
  
      const response = await sendRPCRequest(PROPERTY_PATTERN.PROPERTY.DELETE_PROPERTY, {
        id,
      });
  
      return res.status(response?.status || 500).json(response);
    } catch (error) {
      console.error("Delete Property Controller Error:", error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: "Unexpected error while deleting property",
        error: error.message,
      });
    }
  };