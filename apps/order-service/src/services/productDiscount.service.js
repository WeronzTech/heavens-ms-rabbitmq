import ProductDiscount from "../models/productDiscount.model.js";

export const createProductDiscount = async (data) => {
  try {
    console.log(data);
    const {
      discountName,
      maxAmount,
      discountType,
      discountValue,
      description,
      validFrom,
      validTo,
      merchantId,
      productId, // Array of Product IDs
      status,
    } = data;

    // Date Validation
    if (new Date(validFrom) >= new Date(validTo)) {
      return {
        status: 400,
        message: "'validTo' date must be after 'validFrom' date.",
      };
    }

    // Create the discount
    const newDiscount = await ProductDiscount.create({
      discountName,
      maxAmount,
      discountType,
      discountValue,
      description,
      validFrom,
      validTo,
      merchantId,
      productId,
      status: status !== undefined ? status : true,
    });

    return {
      status: 201,
      data: {
        message: "Product discount created successfully",
        discount: newDiscount,
      },
    };
  } catch (error) {
    console.error("RPC Create Product Discount Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getAllProductDiscounts = async (data) => {
  try {
    const { merchantId, page = 1, limit = 10, status } = data;
    const query = {};

    if (merchantId) {
      query.merchantId = merchantId;
    }

    if (status !== undefined) {
      query.status = status;
    }

    const discounts = await ProductDiscount.find(query)
      .populate("productId", "productName price") // Optional: Populate product details for UI
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ProductDiscount.countDocuments(query);

    return {
      status: 200,
      data: {
        discounts,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("RPC Get All Product Discounts Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getProductDiscountById = async ({ data }) => {
  try {
    const { id } = data;
    const discount = await ProductDiscount.findById(id).populate(
      "productId",
      "productName price"
    );

    if (!discount) {
      return { status: 404, message: "Product discount not found" };
    }

    return { status: 200, data: { discount } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateProductDiscount = async ({ data }) => {
  try {
    const { id, ...updateFields } = data;

    // Validate dates if both are present in update
    if (
      updateFields.validFrom &&
      updateFields.validTo &&
      new Date(updateFields.validFrom) >= new Date(updateFields.validTo)
    ) {
      return {
        status: 400,
        message: "'validTo' date must be after 'validFrom' date.",
      };
    }

    const discount = await ProductDiscount.findByIdAndUpdate(id, updateFields, {
      new: true,
    }).populate("productId", "productName");

    if (!discount) {
      return { status: 404, message: "Product discount not found" };
    }

    return {
      status: 200,
      data: {
        message: "Product discount updated successfully",
        discount,
      },
    };
  } catch (error) {
    console.error("RPC Update Product Discount Error:", error);
    return { status: 500, message: error.message };
  }
};

export const deleteProductDiscount = async ({ data }) => {
  try {
    const { id } = data;
    const discount = await ProductDiscount.findByIdAndDelete(id);

    if (!discount) {
      return { status: 404, message: "Product discount not found" };
    }

    return {
      status: 200,
      data: { message: "Product discount deleted successfully" },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateProductDiscountStatus = async ({ data }) => {
  try {
    const { id, status } = data; // Boolean

    const discount = await ProductDiscount.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!discount) {
      return { status: 404, message: "Product discount not found" };
    }

    return {
      status: 200,
      data: {
        message: `Discount status updated to ${status ? "Active" : "Inactive"}`,
        discount,
      },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};
