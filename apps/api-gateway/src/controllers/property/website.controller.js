import { uploadToFirebase } from "../../../../../libs/common/imageOperation.js";
import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";
export const createWebsitePropertyContent = async (req, res) => {
  try {
    console.log("=== Incoming multipart request ===");
    console.log(req.body);

    // ✅ Normalize fields that might come as arrays
    const propertyId = Array.isArray(req.body.propertyId)
      ? req.body.propertyId[0]
      : req.body.propertyId;

    const {
      propertyName,
      description,
      subDescription,
      fullAddress,
      mainArea,
      mapLink,
      amenities,
      imageTitles,
      imageKeys,
      videoTitles,
      videoKeys,
    } = req.body;

    // ✅ Extract uploaded files (from multer)
    const files = {
      images: req.files?.images || [],
      videos: req.files?.videos || [],
    };

    // ✅ Upload files to Firebase directly in API Gateway
    const uploadedImages = [];
    const uploadedVideos = [];

    if (files.images.length) {
      console.log(`Uploading ${files.images.length} image(s)...`);
      for (let i = 0; i < files.images.length; i++) {
        const file = files.images[i];
        const imageUrl = await uploadToFirebase(file, "property-images");
        uploadedImages.push({
          title: Array.isArray(imageTitles)
            ? imageTitles[i]
            : imageTitles?.[i] || file.originalname || "",
          url: imageUrl,
          description: Array.isArray(imageTitles)
            ? imageTitles[i]
            : imageTitles?.[i] || "",
          key: Array.isArray(imageKeys) ? imageKeys[i] : imageKeys?.[i] || "",
        });
      }
    }

    if (files.videos.length) {
      console.log(`Uploading ${files.videos.length} video(s)...`);
      for (let i = 0; i < files.videos.length; i++) {
        const file = files.videos[i];
        const videoUrl = await uploadToFirebase(file, "property-videos");
        uploadedVideos.push({
          title: Array.isArray(videoTitles)
            ? videoTitles[i]
            : videoTitles?.[i] || file.originalname || "",
          url: videoUrl,
          description: Array.isArray(videoTitles)
            ? videoTitles[i]
            : videoTitles?.[i] || "",
          key: Array.isArray(videoKeys) ? videoKeys[i] : videoKeys?.[i] || "",
        });
      }
    }

    // ✅ Format amenities
    const formattedAmenities =
      typeof amenities === "string"
        ? JSON.parse(amenities)
        : Array.isArray(amenities)
        ? amenities
        : [];

    // ✅ Build payload for RPC (NO file buffers)
    const payload = {
      propertyId,
      propertyName,
      description,
      subDescription,
      location: { fullAddress, mainArea },
      mapLink,
      amenities: formattedAmenities,
      images: uploadedImages,
      videos: uploadedVideos,
    };

    console.log(
      "📤 Sending payload to PROPERTY microservice (no binary data):"
    );
    console.log(JSON.stringify(payload, null, 2));

    // ✅ Send metadata to microservice
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.WEBSITE_CONTENT.ADD_PROPERTY_CONTENT,
      payload
    );

    console.log("📨 Received RPC response:", response);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("❌ Error in createWebsitePropertyContent:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Server error while creating website property content",
    });
  }
};

// export const createWebsitePropertyContent = async (req, res) => {
//   try {
//     console.log("=== Incoming multipart request ===");
//     console.log(req.body);

//     // ✅ Handle possible array form-data case (when using FormData)
//     const propertyId = Array.isArray(req.body.propertyId)
//       ? req.body.propertyId[0]
//       : req.body.propertyId;

//     const {
//       propertyName,
//       description,
//       subDescription,
//       fullAddress,
//       mainArea,
//       mapLink,
//       amenities,
//       imageTitles,
//       imageKeys,
//       videoTitles,
//       videoKeys,
//     } = req.body;

//     // ✅ Extract files (handled by multer)
//     const files = {
//       images: req.files?.images || [],
//       videos: req.files?.videos || [],
//     };

//     // ✅ Prepare payload for RPC call
//     const payload = {
//       propertyId,
//       propertyName,
//       description,
//       subDescription,
//       location: {
//         fullAddress,
//         mainArea,
//       },
//       fullAddress,
//       mainArea,
//       mapLink,
//       amenities:
//         typeof amenities === "string" ? JSON.parse(amenities) : amenities,

//       // Handle possible stringified arrays
//       imageTitles:
//         typeof imageTitles === "string"
//           ? JSON.parse(imageTitles)
//           : imageTitles || [],
//       imageKeys:
//         typeof imageKeys === "string" ? JSON.parse(imageKeys) : imageKeys || [],
//       videoTitles:
//         typeof videoTitles === "string"
//           ? JSON.parse(videoTitles)
//           : videoTitles || [],
//       videoKeys:
//         typeof videoKeys === "string" ? JSON.parse(videoKeys) : videoKeys || [],
//       files,
//     };

//     console.log("📤 Sending payload to PROPERTY microservice:", payload);

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

//     const response = await sendRPCRequest(
//       PROPERTY_PATTERN.WEBSITE_CONTENT.ADD_PROPERTY_CONTENT,
//       payload
//     );

//     console.log("📨 Received RPC response:", response);

//     return res.status(response.status).json(response);
//   } catch (error) {
//     console.error("❌ Error in addWebsitePropertyContent controller:", error);

//     return res.status(500).json({
//       success: false,
//       message:
//         error.message || "Server error while creating website property content",
//     });
//   }
// };

export const getAllWebsitePropertyContents = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.WEBSITE_CONTENT.GET_ALL_PROPERTY_CONTENT,
      {}
    );

    console.log("📨 Website Property Contents RPC Response:", response);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("❌ Error in getWebsitePropertyContents controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching property contents",
    });
  }
};

export const updateWebsitePropertyContent = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🟢 req.body:", req.body);
    console.log("🟢 req.files:", req.files);

    const {
      propertyName,
      description,
      subDescription,
      amenities,
      mapLink,
      mainArea,
      fullAddress,
      keepExistingImages,
      keepExistingVideos,
      existingImagesMeta,
      imagesToDelete,
      videosToDelete,
      imageTitles,
      imageKeys,
      videoTitles,
      videoKeys,
    } = req.body;

    // 🧹 Normalize string values
    const normalize = (val) =>
      typeof val === "string" ? JSON.parse(val || "[]") : val || [];

    const titles = normalize(imageTitles);
    const keys = normalize(imageKeys);
    const videoTitlesArr = normalize(videoTitles);
    const videoKeysArr = normalize(videoKeys);

    const amenitiesArr =
      typeof amenities === "string" ? JSON.parse(amenities) : amenities;

    // ✅ Upload images and videos to Firebase here
    const uploadedImages = [];
    const uploadedVideos = [];

    if (req.files?.images?.length) {
      for (let i = 0; i < req.files.images.length; i++) {
        const file = req.files.images[i];
        const imageUrl = await uploadToFirebase(file, "property-images");
        uploadedImages.push({
          title: titles[i] || file.originalname,
          url: imageUrl,
          key: keys[i] || "",
        });
      }
    }

    if (req.files?.videos?.length) {
      for (let i = 0; i < req.files.videos.length; i++) {
        const file = req.files.videos[i];
        const videoUrl = await uploadToFirebase(file, "property-videos");
        uploadedVideos.push({
          title: videoTitlesArr[i] || file.originalname,
          url: videoUrl,
          key: videoKeysArr[i] || "",
        });
      }
    }

    // ✅ Build payload for RPC (URLs only)
    const payload = {
      id,
      propertyName,
      description,
      subDescription,
      location: { mainArea, fullAddress },
      amenities: amenitiesArr,
      mapLink,
      keepExistingImages: keepExistingImages !== "false",
      keepExistingVideos: keepExistingVideos !== "false",
      existingImagesMeta: normalize(existingImagesMeta),
      imagesToDelete: normalize(imagesToDelete),
      videosToDelete: normalize(videosToDelete),
      uploadedImages,
      uploadedVideos,
    };

    console.log("📤 Sending payload to PROPERTY microservice:", payload);

    const response = await sendRPCRequest(
      PROPERTY_PATTERN.WEBSITE_CONTENT.UPDATE_PROPERTY_CONTENT,
      payload
    );

    return res.status(response.status).json(response);
  } catch (error) {
    console.error(
      "❌ Error in updateWebsitePropertyContent controller:",
      error
    );
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// export const updateWebsitePropertyContent = async (req, res) => {
//   try {
//     const { id } = req.params;

//     console.log("🟢 req.body:", req.body);
//     console.log("🟢 req.files:", req.files);

//     const {
//       propertyName,
//       description,
//       subDescription,
//       amenities,
//       mapLink,
//       mainArea,
//       fullAddress,
//       keepExistingImages,
//       keepExistingVideos,
//       existingImagesMeta,
//       imagesToDelete,
//       imageTitles,
//       imageKeys,
//     } = req.body;

//     // ✅ Normalize imageTitles and imageKeys (might come as strings or arrays)
//     const titles =
//       typeof imageTitles === "string"
//         ? [imageTitles]
//         : Array.isArray(imageTitles)
//         ? imageTitles
//         : [];

//     const keys =
//       typeof imageKeys === "string"
//         ? [imageKeys]
//         : Array.isArray(imageKeys)
//         ? imageKeys
//         : [];

//     // ✅ Attach title & key to each uploaded file
//     let imageFiles = req.files?.images || [];
//     imageFiles = imageFiles.map((file, idx) => ({
//       ...file,
//       description: titles[idx] || "",
//       key: keys[idx] || "",
//     }));

//     const files = {
//       images: imageFiles,
//       videos: req.files?.videos || [],
//     };

//     const locationData = { mainArea, fullAddress };

//     const response = await sendRPCRequest(
//       PROPERTY_PATTERN.WEBSITE_CONTENT.UPDATE_PROPERTY_CONTENT,
//       {
//         id,
//         propertyName,
//         description,
//         subDescription,
//         location: locationData,
//         amenities:
//           typeof amenities === "string" ? JSON.parse(amenities) : amenities,
//         mapLink,
//         files,
//         keepExistingImages:
//           keepExistingImages === "false"
//             ? false
//             : keepExistingImages === "true"
//             ? true
//             : true,
//         keepExistingVideos:
//           keepExistingVideos === "false"
//             ? false
//             : keepExistingVideos === "true"
//             ? true
//             : true,
//         existingImagesMeta:
//           typeof existingImagesMeta === "string"
//             ? JSON.parse(existingImagesMeta)
//             : existingImagesMeta,
//         imagesToDelete:
//           typeof imagesToDelete === "string"
//             ? JSON.parse(imagesToDelete)
//             : imagesToDelete,
//       }
//     );

//     return res.status(response.status).json(response);
//   } catch (error) {
//     console.error(
//       "❌ Error in updateWebsitePropertyContent controller:",
//       error
//     );
//     return res.status(500).json({
//       success: false,
//       message:
//         error.message || "Server error while updating website property content",
//     });
//   }
// };

export const getWebsitePropertyContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.WEBSITE_CONTENT.PROPERTY_CONTENT_BY_ID,
      { id }
    );

    console.log("📨 Website Property Content by id RPC Response:", response);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error(
      "❌ Error in getWebsitePropertyContentById controller:",
      error
    );
    return res.status(500).json({
      success: false,
      message:
        error.message || "Server error while fetching property content by id",
    });
  }
};
