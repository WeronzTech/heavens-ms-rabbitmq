import { deleteFromFirebase } from "../../../../libs/common/imageOperation.js";
import CommonMedia from "../models/commonMedia.model.js";
import WebsitePropertyContent from "../models/websitePropertyContent.model.js";

export const addWebsitePropertyContent = async (data) => {
  try {
    const {
      propertyId,
      propertyName,
      description,
      subDescription,
      location,
      mapLink,
      amenities = [],
      images = [],
      videos = [],
    } = data;

    const formattedAmenities = Array.isArray(amenities)
      ? amenities.map((a) => ({
          name: a.name,
          iconLibrary: a.iconLibrary || "fa",
          iconName: a.iconName,
        }))
      : [];

    const newContent = new WebsitePropertyContent({
      propertyId,
      propertyName,
      description,
      subDescription,
      location,
      amenities: formattedAmenities,
      images,
      videos,
      mapLink,
    });

    const savedContent = await newContent.save();

    return {
      status: 201,
      message: "Website property content created successfully.",
      data: savedContent,
    };
  } catch (error) {
    console.error("❌ Error in addWebsitePropertyContent:", error);
    return { status: 500, message: error.message };
  }
};

export const getAllWebsitePropertyContents = async () => {
  try {
    const contents = await WebsitePropertyContent.aggregate([
      {
        $project: {
          propertyId: 1,
          propertyName: 1,
          images: { $slice: ["$images", 1] }, // get only the first image
          totalImages: { $size: { $ifNull: ["$images", []] } }, // total image count
          totalVideos: { $size: { $ifNull: ["$videos", []] } }, // total video count
        },
      },
    ]);

    return {
      status: 200,
      message: "Website property contents fetched successfully.",
      data: contents,
    };
  } catch (error) {
    console.error("❌ Error in getAllWebsitePropertyContents:", error);
    return { status: 500, message: error.message };
  }
};

export const updateWebsitePropertyContent = async (data) => {
  try {
    const {
      id,
      propertyName,
      description,
      subDescription,
      location,
      amenities,
      mapLink,
      keepExistingImages = true,
      keepExistingVideos = true,
      imagesToDelete = [],
      videosToDelete = [],
      uploadedImages = [],
      uploadedVideos = [],
    } = data;

    const existingContent = await WebsitePropertyContent.findById(id);
    if (!existingContent) {
      return { status: 404, message: "Website property content not found." };
    }

    // 🧹 Delete old images
    let filteredImages = existingContent.images || [];
    if (imagesToDelete.length > 0) {
      for (const url of imagesToDelete) {
        await deleteFromFirebase(url);
      }
      filteredImages = filteredImages.filter(
        (img) => !imagesToDelete.includes(img.url)
      );
    }

    // 🧹 Delete old videos
    let filteredVideos = existingContent.videos || [];
    if (videosToDelete.length > 0) {
      for (const url of videosToDelete) {
        await deleteFromFirebase(url);
      }
      filteredVideos = filteredVideos.filter(
        (vid) => !videosToDelete.includes(vid.url)
      );
    }

    // 🧩 Merge uploads + existing
    const finalImages = keepExistingImages
      ? [...filteredImages, ...uploadedImages]
      : uploadedImages;

    const finalVideos = keepExistingVideos
      ? [...filteredVideos, ...uploadedVideos]
      : uploadedVideos;

    // 🏗️ Update DB
    const updatedContent = await WebsitePropertyContent.findByIdAndUpdate(
      id,
      {
        $set: {
          propertyName,
          description,
          subDescription,
          location,
          amenities,
          mapLink,
          images: finalImages,
          videos: finalVideos,
        },
      },
      { new: true }
    );

    return {
      status: 200,
      message: "Website property content updated successfully.",
      data: updatedContent,
    };
  } catch (err) {
    console.error("❌ Error in updateWebsitePropertyContent:", err);
    return { status: 500, message: err.message };
  }
};

export const getWebsitePropertyContentById = async (data) => {
  try {
    const { id } = data;
    // Fetch single document by _id
    const content = await WebsitePropertyContent.findById(id).lean();

    if (!content) {
      return {
        status: 404,
        message: "Website property content not found.",
      };
    }

    return {
      status: 200,
      message: "Website property content fetched successfully.",
      data: content,
    };
  } catch (error) {
    console.error("❌ Error in getWebsitePropertyContentById:", error);
    return {
      status: 500,
      message: error.message || "Error fetching website property content.",
    };
  }
};

// common media

export const addCommonMediaContent = async (data) => {
  try {
    const { category, mediaItems = [] } = data;

    if (!category) {
      return { status: 400, message: "Category is required." };
    }

    // Format the incoming media items
    const formattedMedia = Array.isArray(mediaItems)
      ? mediaItems.map((item) => ({
          title: item.title || "",
          url: item.url,
          key: item.key || "",
          type: item.type,
        }))
      : [];

    // ✅ Check if a document already exists for this category
    const existingCategory = await CommonMedia.findOne({ category });

    if (existingCategory) {
      // ✅ Push new items into the existing mediaItems array
      existingCategory.mediaItems.push(...formattedMedia);
      existingCategory.updatedAt = new Date();
      const updatedMedia = await existingCategory.save();

      return {
        status: 200,
        message: "Common media updated successfully.",
        data: updatedMedia,
      };
    } else {
      // ✅ Create a new document if not existing
      const newMedia = new CommonMedia({
        category,
        mediaItems: formattedMedia,
      });

      const savedMedia = await newMedia.save();

      return {
        status: 201,
        message: "Common media created successfully.",
        data: savedMedia,
      };
    }
  } catch (error) {
    console.error("❌ Error in addCommonMediaContent:", error);
    return { status: 500, message: error.message };
  }
};

export const getAllCommonMediaSummary = async () => {
  try {
    const allMedia = await CommonMedia.find().lean();

    // ✅ Map and summarize data by category
    const summaries = allMedia.map((media) => {
      const images = media.mediaItems.filter((item) => item.type === "image");
      const videos = media.mediaItems.filter((item) => item.type === "video");

      return {
        category: media.category,
        firstImage: images.length > 0 ? images[0].url : null,
        totalImages: images.length,
        totalVideos: videos.length,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
        id: media._id,
      };
    });

    return {
      status: 200,
      message: "Common media summary fetched successfully.",
      data: summaries,
    };
  } catch (error) {
    console.error("❌ Error in getAllCommonMediaSummary:", error);
    return { status: 500, message: error.message };
  }
};

export const getCommonMediaById = async (data) => {
  try {
    const { id } = data;
    // ✅ Find document by ID
    const media = await CommonMedia.findById(id).lean();

    if (!media) {
      return {
        status: 404,
        message: "Common media not found.",
      };
    }

    // ✅ Return full document as-is
    return {
      status: 200,
      message: "Common media fetched successfully.",
      data: media,
    };
  } catch (error) {
    console.error("❌ Error in getCommonMediaById:", error);
    return {
      status: 500,
      message: error.message || "Server error while fetching common media.",
    };
  }
};

export const deleteCommonMediaItems = async (data) => {
  try {
    const { id, mediaIds = [] } = data; // id = category _id, mediaIds = mediaItems._id[]

    if (!id) {
      return {
        status: 400,
        message: "Category ID is required.",
      };
    }

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return {
        status: 400,
        message: "At least one media item ID must be provided.",
      };
    }

    // ✅ Find the category document
    const existingMedia = await CommonMedia.findById(id);

    if (!existingMedia) {
      return { status: 404, message: "Common media category not found." };
    }

    // ✅ Find media items to delete
    const itemsToDelete = existingMedia.mediaItems.filter((item) =>
      mediaIds.includes(item._id.toString())
    );

    if (itemsToDelete.length === 0) {
      return {
        status: 404,
        message: "No matching media items found to delete.",
      };
    }

    // ✅ Delete from Firebase
    for (const item of itemsToDelete) {
      try {
        await deleteFromFirebase(item.url);
        console.log(`🗑️ Deleted from Firebase: ${item.url}`);
      } catch (err) {
        console.warn(`⚠️ Failed to delete from Firebase: ${item.url}`, err);
      }
    }

    // ✅ Keep only items not deleted
    existingMedia.mediaItems = existingMedia.mediaItems.filter(
      (item) => !mediaIds.includes(item._id.toString())
    );

    existingMedia.updatedAt = new Date();

    const updatedMedia = await existingMedia.save();

    return {
      status: 200,
      message: "Selected media items deleted successfully.",
      data: updatedMedia,
    };
  } catch (error) {
    console.error("❌ Error in deleteCommonMediaItems:", error);
    return { status: 500, message: error.message };
  }
};
