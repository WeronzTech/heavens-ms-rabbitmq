import ProductCategory from "../models/productCategory.model.js";
import {
  uploadToFirebase,
  deleteFromFirebase,
} from "../../../../libs/common/imageOperation.js";

export const createProductCategory = async ( data ) => {
  try {
    const {
      businessCategoryId,
      merchantId,
      categoryName,
      description,
      type,
      order,
      file,
    } = data;

    // Check if category name already exists for this merchant
    const existingCategory = await ProductCategory.findOne({
      merchantId,
      categoryName,
    });

    if (existingCategory) {
      return {
        status: 409,
        message: "Category with this name already exists for this merchant",
      };
    }

    let categoryImageURL = "";
    if (file?.categoryImage && file?.categoryImage[0]?.buffer) {
      const imageFile = {
        buffer: Buffer.from(file.categoryImage[0].buffer, "base64"),
        mimetype: file.categoryImage[0].mimetype,
        originalname: file.categoryImage[0].originalname,
      };
      categoryImageURL = await uploadToFirebase(imageFile, "productCategory");
    }

    const newCategory = await ProductCategory.create({
      businessCategoryId,
      merchantId,
      categoryName,
      description,
      type,
      categoryImageURL,
      order: parseInt(order), // Ensure order is a number
    });

    return {
      status: 201,
      data: {
        message: "Product category created successfully",
        category: newCategory,
      },
    };
  } catch (error) {
    console.error("RPC Create Product Category Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getAllProductCategories = async ({ data }) => {
  try {
    const { merchantId, page = 1, limit = 10, status } = data;
    const query = {};

    if (merchantId) query.merchantId = merchantId;
    if (status !== undefined) query.status = status;

    const categories = await ProductCategory.find(query)
      .sort({ order: 1 }) // ✅ Fetches according to order (Ascending)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ProductCategory.countDocuments(query);

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
    console.error("RPC Get All Product Categories Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getProductCategoryById = async ({ data }) => {
  try {
    const { id } = data;
    const category = await ProductCategory.findById(id);

    if (!category) {
      return { status: 404, message: "Product category not found" };
    }

    return { status: 200, data: { category } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateProductCategory = async ({ data }) => {
  try {
    const { id, ...updateFields } = data;
    const { file } = data;

    const category = await ProductCategory.findById(id);
    if (!category) {
      return { status: 404, message: "Product category not found" };
    }

    // Handle Image Update
    if (file?.categoryImage && file?.categoryImage[0]?.buffer) {
      const imageFile = {
        buffer: Buffer.from(file.categoryImage[0].buffer, "base64"),
        mimetype: file.categoryImage[0].mimetype,
        originalname: file.categoryImage[0].originalname,
      };
      updateFields.categoryImageURL = await uploadToFirebase(
        imageFile,
        "productCategory"
      );

      // Delete old image
      if (category.categoryImageURL) {
        await deleteFromFirebase(category.categoryImageURL);
      }
    }

    const updatedCategory = await ProductCategory.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    return {
      status: 200,
      data: {
        message: "Product category updated successfully",
        category: updatedCategory,
      },
    };
  } catch (error) {
    console.error("RPC Update Product Category Error:", error);
    return { status: 500, message: error.message };
  }
};

export const deleteProductCategory = async ({ data }) => {
  try {
    const { id } = data;
    const category = await ProductCategory.findByIdAndDelete(id);

    if (!category) {
      return { status: 404, message: "Product category not found" };
    }

    if (category.categoryImageURL) {
      await deleteFromFirebase(category.categoryImageURL);
    }

    return {
      status: 200,
      data: { message: "Product category deleted successfully" },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateProductCategoryStatus = async ({ data }) => {
  try {
    const { id, status } = data; // Boolean

    const category = await ProductCategory.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!category) {
      return { status: 404, message: "Product category not found" };
    }

    return {
      status: 200,
      data: {
        message: `Category status updated to ${status ? "Active" : "Inactive"}`,
        category,
      },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

// ✅ Reorder Service
export const reorderProductCategories = async ({ data }) => {
  try {
    const { orderedItems } = data; // Expects array of { id: "...", order: 1 }

    if (!Array.isArray(orderedItems) || orderedItems.length === 0) {
      return { status: 400, message: "Invalid data for reordering" };
    }

    // Use bulkWrite for efficiency instead of individual updates
    const bulkOps = orderedItems.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { order: item.order } },
      },
    }));

    await ProductCategory.bulkWrite(bulkOps);

    return {
      status: 200,
      data: { message: "Categories reordered successfully" },
    };
  } catch (error) {
    console.error("RPC Reorder Categories Error:", error);
    return { status: 500, message: error.message };
  }
};
