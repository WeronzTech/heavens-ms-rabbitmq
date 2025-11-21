import BusinessCategory from "../models/businessCategory.model.js";
import {
  uploadToFirebase,
  deleteFromFirebase,
} from "../../../../libs/common/imageOperation.js";

export const createBusinessCategory = async ({ data }) => {
  try {
    const { title, status, file } = data;

    // Check if title already exists
    const existingCategory = await BusinessCategory.findOne({ title });
    if (existingCategory) {
      return {
        status: 409,
        message: "Business category with this title already exists",
      };
    }

    let bannerImageURL = "";
    if (file?.bannerImage && file?.bannerImage[0]?.buffer) {
      const imageFile = {
        buffer: Buffer.from(file.bannerImage[0].buffer, "base64"),
        mimetype: file.bannerImage[0].mimetype,
        originalname: file.bannerImage[0].originalname,
      };
      bannerImageURL = await uploadToFirebase(imageFile, "businessCategory");
    } else {
      return { status: 400, message: "Banner image is required" };
    }

    const newCategory = await BusinessCategory.create({
      title,
      bannerImageURL,
      status: status !== undefined ? status : true,
    });

    return {
      status: 201,
      data: {
        message: "Business category created successfully",
        category: newCategory,
      },
    };
  } catch (error) {
    console.error("RPC Create Business Category Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getAllBusinessCategories = async (data) => {
  try {
    const { page = 1, limit = 10, status } = data;
    const query = {};

    if (status !== undefined) {
      query.status = status;
    }

    const categories = await BusinessCategory.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await BusinessCategory.countDocuments(query);

    return {
      status: 200,
      data: {
        categories,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("RPC Get All Business Categories Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getBusinessCategoryById = async (data) => {
  try {
    const { id } = data;
    const category = await BusinessCategory.findById(id);

    if (!category) {
      return { status: 404, message: "Business category not found" };
    }

    return { status: 200, data: { category } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateBusinessCategory = async ({ data }) => {
  try {
    const { id, title, status, file } = data;

    const category = await BusinessCategory.findById(id);
    if (!category) {
      return { status: 404, message: "Business category not found" };
    }

    let bannerImageURL = category.bannerImageURL;

    // Upload new image if provided
    if (file?.bannerImage && file?.bannerImage[0]?.buffer) {
      const imageFile = {
        buffer: Buffer.from(file.bannerImage[0].buffer, "base64"),
        mimetype: file.bannerImage[0].mimetype,
        originalname: file.bannerImage[0].originalname,
      };
      bannerImageURL = await uploadToFirebase(imageFile, "businessCategory");

      // Delete old image
      await deleteFromFirebase(category.bannerImageURL);
    }

    // Update fields
    if (title) category.title = title;
    if (status !== undefined) category.status = status;
    category.bannerImageURL = bannerImageURL;

    await category.save();

    return {
      status: 200,
      data: {
        message: "Business category updated successfully",
        category,
      },
    };
  } catch (error) {
    console.error("RPC Update Business Category Error:", error);
    return { status: 500, message: error.message };
  }
};

export const deleteBusinessCategory = async ({ data }) => {
  try {
    const { id } = data;
    const category = await BusinessCategory.findByIdAndDelete(id);

    if (!category) {
      return { status: 404, message: "Business category not found" };
    }

    // Delete image from storage
    if (category.bannerImageURL) {
      await deleteFromFirebase(category.bannerImageURL);
    }

    return {
      status: 200,
      data: { message: "Business category deleted successfully" },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateBusinessCategoryStatus = async ({ data }) => {
  try {
    const { id, status } = data; // Boolean

    const category = await BusinessCategory.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!category) {
      return { status: 404, message: "Business category not found" };
    }

    return {
      status: 200,
      data: {
        message: `Status updated to ${status ? "Active" : "Inactive"}`,
        category,
      },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};
