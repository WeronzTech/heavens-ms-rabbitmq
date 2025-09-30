import { deleteFromFirebase, uploadToFirebase } from "../../../../libs/common/imageOperation.js";
import Carousel from "../models/carousel.model.js";

export const addCarouselImages = async (data) => {
  try {
    const { file, title, userId, propertyId } = data;

    if (!file) {
      return {
        success: false,
        status: 400,
        message: "No image provided",
      };
    }

    if (!propertyId) {
      return {
        success: false,
        status: 400,
        message: "Property ID is required",
      };
    }

    if (!userId) {
      return {
        success: false,
        status: 400,
        message: "User ID is required",
      };
    }

    // Upload single image to Firebase
    const imageUrl = await uploadToFirebase(file, "carousel");

    // Save in DB
    const carousel = await Carousel.create({
      title: title || "Default Carousel",
      propertyId,
      image: imageUrl, // ✅ single image
      createdBy: userId,
    });

    return {
      success: true,
      status: 201,
      message: "Carousel created successfully",
      data: carousel,
    };
  } catch (error) {
    console.error("Error in addCarouselImages Service:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error while adding carousel image",
      error: error.message,
    };
  }
};
export const updateCarouselImages = async (data) => {
  try {
    const { carouselId, file, title, userId, propertyId } = data;

    if (!carouselId) {
      return { success: false, status: 400, message: "Carousel ID is required" };
    }

    if (!userId) {
      return { success: false, status: 400, message: "User ID is required" };
    }

    // Fetch the existing carousel
    const carousel = await Carousel.findById(carouselId);
    if (!carousel) {
      return { success: false, status: 404, message: "Carousel not found" };
    }

    // If a new file is uploaded, replace the old image
    if (file) {
      // Delete existing image from Firebase
      if (carousel.image) {
        try {
          await deleteFromFirebase(carousel.image);
        } catch (err) {
          console.error(`Failed to delete existing image from Firebase: ${carousel.image}`, err);
        }
      }

      // Upload new image to Firebase
      const newImageUrl = await uploadToFirebase(file, "carousel");
      carousel.image = newImageUrl;
    }

    // Update other fields
    carousel.title = title || carousel.title;
    carousel.propertyId = propertyId || carousel.propertyId;

    await carousel.save();

    return {
      success: true,
      status: 200,
      message: "Carousel updated successfully",
      data: carousel,
    };
  } catch (error) {
    console.error("Error in updateCarouselImages Service:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error while updating carousel image",
      error: error.message,
    };
  }
};

export const deleteCarousel = async (data) => {
  try {
    const { carouselId, userId } = data;

    if (!carouselId) {
      return { success: false, status: 400, message: "Carousel ID is required" };
    }

    if (!userId) {
      return { success: false, status: 400, message: "User ID is required" };
    }

    const carousel = await Carousel.findById(carouselId);
    if (!carousel) {
      return { success: false, status: 404, message: "Carousel not found" };
    }

    // Delete image from Firebase
    if (carousel.image) {
      try {
        await deleteFromFirebase(carousel.image);
      } catch (err) {
        console.error(`Failed to delete image from Firebase: ${carousel.image}`, err);
      }
    }

    await carousel.deleteOne();

    return {
      success: true,
      status: 200,
      message: "Carousel deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteCarousel Service:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error while deleting carousel",
      error: error.message,
    };
  }
};