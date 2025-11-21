import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../../libs/patterns/order/order.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const createProduct = (req, res) => {
  const payload = { ...req.body };
  // Handle File Upload
  if (req.files?.productImage?.[0]) {
    payload.file = {
      productImage: [
        {
          buffer: req.files.productImage[0].buffer.toString("base64"),
          mimetype: req.files.productImage[0].mimetype,
          originalname: req.files.productImage[0].originalname,
        },
      ],
    };
  }
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT.CREATE_PRODUCT,
    payload
  );
};

export const updateProduct = (req, res) => {
  const payload = { ...req.body, id: req.params.id };
  if (req.files?.productImage?.[0]) {
    payload.file = {
      productImage: [
        {
          buffer: req.files.productImage[0].buffer.toString("base64"),
          mimetype: req.files.productImage[0].mimetype,
          originalname: req.files.productImage[0].originalname,
        },
      ],
    };
  }
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT.UPDATE_PRODUCT,
    payload
  );
};

export const getProductsByCategory = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT.GET_PRODUCTS_BY_CATEGORY,
    req.query
  );
};

export const getProductById = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.PRODUCT.GET_PRODUCT_BY_ID, {
    id: req.params.id,
    merchantId: req.query.merchantId,
  });
};

export const deleteProduct = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.PRODUCT.DELETE_PRODUCT, {
    id: req.params.id,
  });
};

export const reorderProducts = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT.REORDER_PRODUCTS,
    req.body
  );
};
