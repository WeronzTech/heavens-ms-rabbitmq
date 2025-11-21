import Product from "../models/products.model.js";
import MerchantDiscount from "../models/merchantDiscount.model.js";
import ProductDiscount from "../models/productDiscount.model.js";
import {
  uploadToFirebase,
  deleteFromFirebase,
} from "../../../../libs/common/imageOperation.js";

// --- Helper: Calculate Discounted Price ---
const calculateFinalPrice = (product, merchantDiscount) => {
  const originalPrice = product.price;
  let finalPrice = originalPrice;
  let appliedDiscount = null;

  const now = new Date();

  // 1. Check Merchant Discount (Priority)
  // We check if a merchant discount is passed and is currently valid
  if (
    merchantDiscount &&
    merchantDiscount.status &&
    new Date(merchantDiscount.validFrom) <= now &&
    new Date(merchantDiscount.validTo) >= now
  ) {
    appliedDiscount = {
      source: "Merchant",
      name: merchantDiscount.discountName,
      type: merchantDiscount.discountType,
      value: merchantDiscount.discountValue,
    };

    if (merchantDiscount.discountType === "Percentage-discount") {
      finalPrice =
        originalPrice - (originalPrice * merchantDiscount.discountValue) / 100;
    } else if (merchantDiscount.discountType === "Flat-discount") {
      // Note: Applying flat merchant discount per item might result in negatives if not careful,
      // usually flat merchant discounts are for the whole cart, but applying per instructions.
      finalPrice = originalPrice - merchantDiscount.discountValue;
    }
  }
  // 2. Check Product Discount (Fallback)
  else if (
    product.discountId &&
    product.discountId.status &&
    new Date(product.discountId.validFrom) <= now &&
    new Date(product.discountId.validTo) >= now
  ) {
    const pDiscount = product.discountId;
    appliedDiscount = {
      source: "Product",
      name: pDiscount.discountName,
      type: pDiscount.discountType,
      value: pDiscount.discountValue,
    };

    if (pDiscount.discountType === "Percentage-discount") {
      finalPrice =
        originalPrice - (originalPrice * pDiscount.discountValue) / 100;
    } else if (pDiscount.discountType === "Flat-discount") {
      finalPrice = originalPrice - pDiscount.discountValue;
    }
  }

  // Ensure price doesn't drop below zero
  finalPrice = Math.max(0, finalPrice);

  return {
    ...product.toObject(),
    originalPrice,
    discountedPrice: parseFloat(finalPrice.toFixed(2)),
    appliedDiscount,
  };
};

// --- CRUD Operations ---

export const createProduct = async (data) => {
  console.log(data);
  try {
    const {
      productName,
      price,
      costPrice,
      minQuantityToOrder,
      maxQuantityPerOrder,
      preparationTime,
      description,
      longDescription,
      type,
      categoryId,
      merchantId,
      inventory,
      order,
      searchTags,
      discountId,
      file,
    } = data;

    let productImageURL = null;
    if (file?.productImage && file?.productImage[0]?.buffer) {
      const imageFile = {
        buffer: Buffer.from(file.productImage[0].buffer, "base64"),
        mimetype: file.productImage[0].mimetype,
        originalname: file.productImage[0].originalname,
      };
      productImageURL = await uploadToFirebase(imageFile, "products");
    }

    const newProduct = await Product.create({
      productName,
      price,
      costPrice,
      minQuantityToOrder: minQuantityToOrder || 0,
      maxQuantityPerOrder: maxQuantityPerOrder || 0,
      preparationTime,
      description,
      longDescription,
      type,
      categoryId,
      merchantId,
      inventory: inventory !== undefined ? inventory : true,
      order: parseInt(order),
      searchTags: searchTags || [],
      discountId: discountId || null,
      productImageURL,
    });

    return {
      status: 201,
      data: {
        message: "Product created successfully",
        product: newProduct,
      },
    };
  } catch (error) {
    console.error("RPC Create Product Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getProductsByCategory = async (data) => {
  try {
    const { categoryId, merchantId } = data;

    if (!categoryId || !merchantId) {
      return {
        status: 400,
        message: "Category ID and Merchant ID are required",
      };
    }

    // 1. Fetch active Merchant Discount
    const now = new Date();
    const merchantDiscount = await MerchantDiscount.findOne({
      merchantId,
      status: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    }).sort({ createdAt: -1 }); // Get latest if multiple

    // 2. Fetch Products sorted by Order
    // Populate discountId to check for product-specific discounts
    const products = await Product.find({ categoryId })
      .sort({ order: 1 })
      .populate("discountId");

    // 3. Process each product to calculate price
    const processedProducts = products.map((product) =>
      calculateFinalPrice(product, merchantDiscount)
    );

    return {
      status: 200,
      data: {
        products: processedProducts,
      },
    };
  } catch (error) {
    console.error("RPC Get Products By Category Error:", error);
    return { status: 500, message: error.message };
  }
};

export const getProductById = async ({ data }) => {
  try {
    const { id, merchantId } = data; // Merchant ID needed for discount check

    const product = await Product.findById(id).populate("discountId");
    if (!product) {
      return { status: 404, message: "Product not found" };
    }

    // Need merchantId to check for merchant-wide discounts
    // If not provided in request, we can try to get it from the product (if schema stores it reliably as ObjectId or String)
    const mId = merchantId || product.merchantId;

    const now = new Date();
    const merchantDiscount = await MerchantDiscount.findOne({
      merchantId: mId,
      status: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    });

    const processedProduct = calculateFinalPrice(product, merchantDiscount);

    return { status: 200, data: { product: processedProduct } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const updateProduct = async ({ data }) => {
  try {
    const { id, ...updateFields } = data;
    const { file } = data;

    const product = await Product.findById(id);
    if (!product) {
      return { status: 404, message: "Product not found" };
    }

    // Handle Image
    if (file?.productImage && file?.productImage[0]?.buffer) {
      const imageFile = {
        buffer: Buffer.from(file.productImage[0].buffer, "base64"),
        mimetype: file.productImage[0].mimetype,
        originalname: file.productImage[0].originalname,
      };
      updateFields.productImageURL = await uploadToFirebase(
        imageFile,
        "products"
      );

      if (product.productImageURL) {
        await deleteFromFirebase(product.productImageURL);
      }
    }

    // Update
    const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    return {
      status: 200,
      data: {
        message: "Product updated successfully",
        product: updatedProduct,
      },
    };
  } catch (error) {
    console.error("RPC Update Product Error:", error);
    return { status: 500, message: error.message };
  }
};

export const deleteProduct = async ({ data }) => {
  try {
    const { id } = data;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return { status: 404, message: "Product not found" };
    }

    if (product.productImageURL) {
      await deleteFromFirebase(product.productImageURL);
    }

    return { status: 200, data: { message: "Product deleted successfully" } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

export const reorderProducts = async ({ data }) => {
  try {
    const { orderedItems } = data; // Array of { id: "...", order: 1 }

    if (!Array.isArray(orderedItems) || orderedItems.length === 0) {
      return { status: 400, message: "Invalid data for reordering" };
    }

    const bulkOps = orderedItems.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { order: item.order } },
      },
    }));

    await Product.bulkWrite(bulkOps);

    return {
      status: 200,
      data: { message: "Products reordered successfully" },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};
