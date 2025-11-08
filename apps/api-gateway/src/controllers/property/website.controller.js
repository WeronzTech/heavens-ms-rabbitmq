import { uploadToFirebase } from "../../../../../libs/common/imageOperation.js";
import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../../libs/patterns/property/property.pattern.js";

export const createWebsitePropertyContent = async (req, res) => {
  try {
    // console.log("=== Incoming multipart request ===");
    // console.log(req.body);

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
        const imageUrl = await uploadToFirebase(
          file,
          "website-property-images"
        );
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
        const videoUrl = await uploadToFirebase(
          file,
          "website-property-videos"
        );
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

    // console.log(
    //   "📤 Sending payload to PROPERTY microservice (no binary data):"
    // );
    // console.log(JSON.stringify(payload, null, 2));

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

    // console.log("🟢 req.body:", req.body);
    // console.log("🟢 req.files:", req.files);

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

    // console.log("📤 Sending payload to PROPERTY microservice:", payload);

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

export const getWebsitePropertyContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.WEBSITE_CONTENT.PROPERTY_CONTENT_BY_ID,
      { id }
    );

    // console.log("📨 Website Property Content by id RPC Response:", response);

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

// common media

export const createCommonMediaContent = async (req, res) => {
  try {
    // console.log("=== Incoming multipart request for common media ===");
    // console.log(req.body);

    // 🧩 Normalize array fields (handles single + multiple values)
    const normalizeArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "string") return [value];
      return [];
    };

    const category = req.body.category;
    const mediaTitles = normalizeArray(req.body.mediaTitles);
    const mediaKeys = normalizeArray(req.body.mediaKeys);
    const mediaTypes = normalizeArray(req.body.mediaTypes);

    if (!category) {
      return res
        .status(400)
        .json({ success: false, message: "Category is required" });
    }

    // ✅ Extract uploaded files
    const files = req.files?.media || [];
    const uploadedMedia = [];

    if (files.length) {
      // console.log(`Uploading ${files.length} media file(s)...`);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // ✅ Determine file type
        const fileType =
          mediaTypes[i] ||
          (file.mimetype?.startsWith("video/") ? "video" : "image");

        // ✅ Decide upload folder
        const uploadFolder =
          fileType === "video"
            ? "website-common-videos"
            : "website-common-images";

        // ✅ Upload to Firebase
        const fileUrl = await uploadToFirebase(file, uploadFolder);

        // ✅ Push formatted media
        uploadedMedia.push({
          title: mediaTitles[i] || file.originalname || "",
          url: fileUrl,
          key: mediaKeys[i] || "",
          type: fileType,
        });
      }
    }

    // ✅ Build payload for RPC
    const payload = {
      category,
      mediaItems: uploadedMedia,
    };

    // console.log("📤 Sending payload to COMMON MEDIA microservice:");
    // console.log(JSON.stringify(payload, null, 2));

    // ✅ Send metadata via RPC
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.WEBSITE_CONTENT.ADD_COMMON_MEDIA_CONTENT,
      payload
    );

    // console.log("📨 Received RPC response:", response);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("❌ Error in createCommonMediaContent:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Server error while uploading common media content",
    });
  }
};

export const getAllCommonMedia = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.WEBSITE_CONTENT.GET_ALL_COMMON_MEDIA_CONTENT,
      {}
    );

    // console.log("📨 Website common Contents RPC Response:", response);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("❌ Error in getAllCommonMedia controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching common contents",
    });
  }
};

export const getCommonMediaById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.WEBSITE_CONTENT.COMMON_CONTENT_BY_ID,
      { id }
    );

    // console.log("📨 common website Content by id RPC Response:", response);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("❌ Error in getCommonMediaById controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching  content by id",
    });
  }
};

export const deleteCommonMediaItemsController = async (req, res) => {
  try {
    // console.log("=== Incoming delete request for common media ===");
    // console.log(req.body);
    const { id } = req.params;
    const { mediaIds } = req.body;

    if (!id && !mediaIds) {
      return res.status(400).json({
        success: false,
        message: "Either ID or category is required to delete media.",
      });
    }

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one media id must be provided for deletion.",
      });
    }

    // ✅ Payload for microservice
    const payload = { id, mediaIds };

    // console.log("📤 Sending delete payload to COMMON MEDIA microservice:");
    // console.log(JSON.stringify(payload, null, 2));

    // ✅ Send RPC to microservice
    const response = await sendRPCRequest(
      PROPERTY_PATTERN.WEBSITE_CONTENT.DELETE_COMMON_MEDIA_CONTENT,
      payload
    );

    console.log("📨 Received RPC delete response:", response);

    return res.status(response.status).json(response);
  } catch (error) {
    console.error("❌ Error in deleteCommonMediaItemsController:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "Server error while deleting common media items.",
    });
  }
};
