import MerchantDiscount from "../models/merchantDiscount.model.js";

export const createMerchantDiscount = async ({ data }) => {
  try {
    const {
      discountName,
      maxCheckoutValue,
      maxDiscountValue,
      discountType,
      discountValue,
      description,
      validFrom,
      validTo,
      merchantId,
      status,
    } = data;

    // Basic Date Validation
    if (new Date(validFrom) >= new Date(validTo)) {
      return {
        status: 400,
        message: "'validTo' date must be after 'validFrom' date.",
      };
    }

    const newDiscount = await MerchantDiscount.create({
      discountName,
      maxCheckoutValue,
      maxDiscountValue,
      discountType,
      discountValue,
      description,
      validFrom,
      validTo,
      merchantId,
      status: status !== undefined ? status : false,
    });

    return {
      status: 201,
      data: {
        message: "Merchant discount created successfully",
        discount: newDiscount,
      },
    };
  } catch (error) {
    console.error("RPC Create Merchant Discount Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getAllMerchantDiscounts = async ({ data }) => {
  try {
    const { merchantId, page = 1, limit = 10, status } = data;
    const query = {};

    if (merchantId) {
      query.merchantId = merchantId;
    }

    if (status !== undefined) {
      query.status = status;
    }

    const discounts = await MerchantDiscount.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MerchantDiscount.countDocuments(query);

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
    console.error("RPC Get All Merchant Discounts Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getMerchantDiscountById = async ({ data }) => {
  try {
    const { id } = data;
    const discount = await MerchantDiscount.findById(id);

    if (!discount) {
      return { status: 404, message: "Merchant discount not found" };
    }

    return { status: 200, data: { discount } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateMerchantDiscount = async ({ data }) => {
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

    const discount = await MerchantDiscount.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!discount) {
      return { status: 404, message: "Merchant discount not found" };
    }

    return {
      status: 200,
      data: {
        message: "Merchant discount updated successfully",
        discount,
      },
    };
  } catch (error) {
    console.error("RPC Update Merchant Discount Error:", error);
    return { status: 500, message: error.message };
  }
};

export const deleteMerchantDiscount = async ({ data }) => {
  try {
    const { id } = data;
    const discount = await MerchantDiscount.findByIdAndDelete(id);

    if (!discount) {
      return { status: 404, message: "Merchant discount not found" };
    }

    return {
      status: 200,
      data: { message: "Merchant discount deleted successfully" },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateMerchantDiscountStatus = async ({ data }) => {
  try {
    const { id, status } = data; // Boolean

    const discount = await MerchantDiscount.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!discount) {
      return { status: 404, message: "Merchant discount not found" };
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
