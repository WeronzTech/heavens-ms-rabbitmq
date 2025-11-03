import {
  deleteFromFirebase,
  uploadToFirebase,
} from "../../../../libs/common/imageOperation.js";
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

// export const addWebsitePropertyContent = async (data) => {
//   try {
//     console.log("=== FULL REQUEST BODY ===");
//     console.log(data);

//     const {
//       propertyId,
//       propertyName,
//       description,
//       subDescription,
//       location,
//       mapLink,
//       amenities,
//       imageTitles = [],
//       imageKeys = [],
//       videoTitles = [],
//       videoKeys = [],
//     } = data;

//     const files = data.files;

//     console.log("imageTitles:", imageTitles);
//     console.log("imageKeys:", imageKeys);

//     // ✅ Handle uploads for images and videos
//     const uploadedImages = [];
//     const uploadedVideos = [];

//     if (files?.images?.length) {
//       for (let i = 0; i < files.images.length; i++) {
//         const file = files.images[i];
//         const imageUrl = await uploadToFirebase(file, "property-images");

//         uploadedImages.push({
//           title: imageTitles[i] || file.originalname || "",
//           url: imageUrl,
//           description: imageTitles[i] || "",
//           key: imageKeys[i] || "",
//         });
//       }
//     }

//     if (files?.videos?.length) {
//       for (let i = 0; i < files.videos.length; i++) {
//         const file = files.videos[i];
//         const videoUrl = await uploadToFirebase(file, "property-videos");

//         uploadedVideos.push({
//           title: videoTitles[i] || file.originalname || "",
//           url: videoUrl,
//           description: videoTitles[i] || "",
//           key: videoKeys[i] || "",
//         });
//       }
//     }

//     // ✅ Format amenities (if any)
//     const formattedAmenities = Array.isArray(amenities)
//       ? amenities.map((a) => ({
//           name: a.name,
//           iconLibrary: a.iconLibrary || "fa",
//           iconName: a.iconName,
//         }))
//       : [];

//     // ✅ Create new WebsitePropertyContent document
//     const newContent = new WebsitePropertyContent({
//       propertyId,
//       propertyName,
//       description,
//       subDescription,
//       location,
//       amenities: formattedAmenities,
//       images: uploadedImages,
//       videos: uploadedVideos,
//       mapLink,
//     });

//     const savedContent = await newContent.save();

//     return {
//       status: 201,
//       message: "Website property content created successfully.",
//       data: savedContent,
//     };
//   } catch (error) {
//     console.error("❌ Error in addWebsitePropertyContent:", error);
//     return { status: 500, message: error.message };
//   }
// };

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

    console.log("🟢 [PROPERTY] Received update payload:", data);

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

// export const updateWebsitePropertyContent = async (data) => {
//   try {
//     const {
//       id,
//       propertyId,
//       propertyName,
//       description,
//       subDescription,
//       location,
//       amenities,
//       mapLink,
//       files,
//       keepExistingImages = true,
//       keepExistingVideos = true,
//       imagesToDelete = [],
//       videosToDelete = [], // optional, for video deletion too
//     } = data;

//     console.log("[PROPERTY] Incoming Data:", data);

//     // ✅ 1. Validate existence
//     const existingContent = await WebsitePropertyContent.findById(id);
//     if (!existingContent) {
//       return {
//         status: 404,
//         message: "Website property content not found.",
//       };
//     }

//     // ✅ 2. Remove deleted images (from DB + Firebase)
//     let filteredImages = existingContent.images || [];

//     if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
//       console.log("🧹 Removing images:", imagesToDelete);

//       // Delete from Firebase
//       for (const imageUrl of imagesToDelete) {
//         try {
//           await deleteFromFirebase(imageUrl);
//           console.log(`🗑️ Deleted image from Firebase: ${imageUrl}`);
//         } catch (delErr) {
//           console.warn(
//             `⚠️ Failed to delete image ${imageUrl}:`,
//             delErr.message
//           );
//         }
//       }

//       // Remove from DB object
//       filteredImages = filteredImages.filter(
//         (img) => !imagesToDelete.includes(img.url)
//       );
//     }

//     // ✅ 3. Remove deleted videos (if provided)
//     let filteredVideos = existingContent.videos || [];

//     if (Array.isArray(videosToDelete) && videosToDelete.length > 0) {
//       console.log("🧹 Removing videos:", videosToDelete);

//       for (const videoUrl of videosToDelete) {
//         try {
//           await deleteFromFirebase(videoUrl);
//           console.log(`🗑️ Deleted video from Firebase: ${videoUrl}`);
//         } catch (delErr) {
//           console.warn(
//             `⚠️ Failed to delete video ${videoUrl}:`,
//             delErr.message
//           );
//         }
//       }

//       filteredVideos = filteredVideos.filter(
//         (vid) => !videosToDelete.includes(vid.url)
//       );
//     }

//     // ✅ 4. Handle new uploads
//     const uploadedImages = [];
//     if (files?.images?.length) {
//       for (const file of files.images) {
//         const imageUrl = await uploadToFirebase(file, "property-images");
//         uploadedImages.push({
//           title: file.description || "",
//           url: imageUrl,
//           key: file.key || "",
//         });
//       }
//     }

//     const uploadedVideos = [];
//     if (files?.videos?.length) {
//       for (const file of files.videos) {
//         const videoUrl = await uploadToFirebase(file, "property-videos");
//         uploadedVideos.push({
//           title: file.originalname || "",
//           url: videoUrl,
//           description: file.description || "",
//           key: file.key || "",
//         });
//       }
//     }

//     // ✅ 5. Merge all media
//     const finalImages = keepExistingImages
//       ? [...filteredImages, ...uploadedImages]
//       : uploadedImages;

//     const finalVideos = keepExistingVideos
//       ? [...filteredVideos, ...uploadedVideos]
//       : uploadedVideos;

//     // ✅ 6. Format amenities
//     const formattedAmenities = Array.isArray(amenities)
//       ? amenities.map((a) => ({
//           name: a.name,
//           iconLibrary: a.iconLibrary || "fa",
//           iconName: a.iconName,
//         }))
//       : existingContent.amenities;

//     // ✅ 7. Prepare and save update
//     const updatedData = {
//       propertyId: propertyId || existingContent.propertyId,
//       propertyName: propertyName || existingContent.propertyName,
//       description: description || existingContent.description,
//       subDescription: subDescription || existingContent.subDescription,
//       location: location || existingContent.location,
//       amenities: formattedAmenities,
//       mapLink: mapLink || existingContent.mapLink,
//       images: finalImages,
//       videos: finalVideos,
//     };

//     const updatedContent = await WebsitePropertyContent.findByIdAndUpdate(
//       id,
//       { $set: updatedData },
//       { new: true }
//     );

//     return {
//       status: 200,
//       message: "Website property content updated successfully.",
//       data: updatedContent,
//     };
//   } catch (error) {
//     console.error("❌ Error in updateWebsitePropertyContent:", error);
//     return { status: 500, message: error.message };
//   }
// };

// export const updateWebsitePropertyContent = async (data) => {
//   try {
//     const {
//       id,
//       propertyId,
//       propertyName,
//       description,
//       subDescription,
//       location,
//       amenities,
//       mapLink,
//       files,
//       keepExistingImages = true,
//       keepExistingVideos = true,
//       imagesToDelete = [], // ✅ add this
//     } = data;

//     console.log("[PROPERTY] Incoming Data:", data);

//     const existingContent = await WebsitePropertyContent.findById(id);
//     if (!existingContent) {
//       return {
//         status: 404,
//         message: "Website property content not found.",
//       };
//     }

//     // ✅ Remove deleted images first
//     let filteredImages = existingContent.images || [];
//     if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
//       filteredImages = filteredImages.filter(
//         (img) => !imagesToDelete.includes(img.url)
//       );
//       console.log("🧹 Removed images:", imagesToDelete);
//     }

//     // ✅ Handle uploads
//     const uploadedImages = [];
//     if (files?.images?.length) {
//       for (const file of files.images) {
//         const imageUrl = await uploadToFirebase(file, "property-images");
//         uploadedImages.push({
//           title: file.description || "",
//           url: imageUrl,
//           key: file.key || "",
//         });
//       }
//     }

//     // ✅ Merge final image set
//     const finalImages = keepExistingImages
//       ? [...filteredImages, ...uploadedImages]
//       : uploadedImages;

//     const uploadedVideos = [];
//     if (files?.videos?.length) {
//       for (const file of files.videos) {
//         const videoUrl = await uploadToFirebase(file, "property-videos");
//         uploadedVideos.push({
//           title: file.originalname || "",
//           url: videoUrl,
//           description: file.description || "",
//           key: file.key || "",
//         });
//       }
//     }

//     const formattedAmenities = Array.isArray(amenities)
//       ? amenities.map((a) => ({
//           name: a.name,
//           iconLibrary: a.iconLibrary || "fa",
//           iconName: a.iconName,
//         }))
//       : existingContent.amenities;

//     const updatedData = {
//       propertyId: propertyId || existingContent.propertyId,
//       propertyName: propertyName || existingContent.propertyName,
//       description: description || existingContent.description,
//       subDescription: subDescription || existingContent.subDescription,
//       location: location || existingContent.location,
//       amenities: formattedAmenities,
//       mapLink: mapLink || existingContent.mapLink,
//       images: finalImages,
//       videos: keepExistingVideos
//         ? [...existingContent.videos, ...uploadedVideos]
//         : uploadedVideos,
//     };

//     const updatedContent = await WebsitePropertyContent.findByIdAndUpdate(
//       id,
//       { $set: updatedData },
//       { new: true }
//     );

//     return {
//       status: 200,
//       message: "Website property content updated successfully.",
//       data: updatedContent,
//     };
//   } catch (error) {
//     console.error("❌ Error in updateWebsitePropertyContent:", error);
//     return { status: 500, message: error.message };
//   }
// };

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
