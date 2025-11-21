import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../../libs/patterns/order/order.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

export const createProductCategory = (req, res) => {
  const payload = { ...req.body };
  if (req.files?.categoryImage?.[0]) {
    payload.file = {
      categoryImage: [
        {
          buffer: req.files.categoryImage[0].buffer.toString("base64"),
          mimetype: req.files.categoryImage[0].mimetype,
          originalname: req.files.categoryImage[0].originalname,
        },
      ],
    };
  }
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT_CATEGORY.CREATE_CATEGORY,
    payload
  );
};

export const getAllProductCategories = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT_CATEGORY.GET_ALL_CATEGORIES,
    req.query
  );
};

export const getProductCategoryById = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT_CATEGORY.GET_CATEGORY_BY_ID,
    { id: req.params.id }
  );
};

export const updateProductCategory = (req, res) => {
  const payload = { ...req.body, id: req.params.id };
  if (req.files?.categoryImage?.[0]) {
    payload.file = {
      categoryImage: [
        {
          buffer: req.files.categoryImage[0].buffer.toString("base64"),
          mimetype: req.files.categoryImage[0].mimetype,
          originalname: req.files.categoryImage[0].originalname,
        },
      ],
    };
  }
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT_CATEGORY.UPDATE_CATEGORY,
    payload
  );
};

export const deleteProductCategory = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT_CATEGORY.DELETE_CATEGORY,
    { id: req.params.id }
  );
};

export const updateProductCategoryStatus = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT_CATEGORY.UPDATE_STATUS,
    {
      id: req.params.id,
      status: req.body.status,
    }
  );
};

export const reorderProductCategories = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT_CATEGORY.REORDER_CATEGORIES,
    req.body
  );
};
