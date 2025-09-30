import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";


export const addCarouselImagesController = async (req, res) => {
    try {
      const file = req.file|| {};
      const { title, propertyId } = req.body || {};
      const userId = req.userAuth;
  
      console.log(req.files )
 
      const response = await sendRPCRequest(
        PROPERTY_PATTERN.CAROUSEL.ADD_CAROUSEL,
        { file, title, userId, propertyId }
      );
  
      return res.status(response?.status || 500).json(response);
    } catch (error) {
      console.error("RPC Add Carousel Images Controller Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error in API Gateway",
        error: error.message,
      });
    }
  };
  
  export const updateCarouselImagesController = async (req, res) => {
    try {
      const file = req.file || [];
      const { id } = req.params;
      const { title,propertyId } = req.body || {};
      const userId = req.userAuth;
  
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Carousel ID is required",
        });
      }
  
      console.log("Files received:", file);
      console.log("Body received:", req.body);
  
      const response = await sendRPCRequest(
        PROPERTY_PATTERN.CAROUSEL.UPDATE_CAROUSEL,
        {
          carouselId: id,
          file,       
          title,      
          userId,
          propertyId       
        }
      );
  
      return res.status(response?.status || 500).json(response);
    } catch (error) {
      console.error("RPC Update Carousel Images Controller Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error in API Gateway",
        error: error.message,
      });
    }
  };

  export const deleteCarouselController = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.userAuth;
  
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Carousel ID is required",
        });
      }
  
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }
  
      const response = await sendRPCRequest(
        PROPERTY_PATTERN.CAROUSEL.DELETE_CAROUSEL,
        { carouselId: id, userId }
      );
  
      return res.status(response?.status || 500).json(response);
    } catch (error) {
      console.error("RPC Delete Carousel Controller Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error in API Gateway",
        error: error.message,
      });
    }
  };