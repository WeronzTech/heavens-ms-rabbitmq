import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../../libs/patterns/order/order.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

export const createBusinessCategory = (req, res) => {
  const payload = { ...req.body };
  if (req.files?.bannerImage?.[0]) {
    payload.file = {
      bannerImage: [
        {
          buffer: req.files.bannerImage[0].buffer.toString("base64"),
          mimetype: req.files.bannerImage[0].mimetype,
          originalname: req.files.bannerImage[0].originalname,
        },
      ],
    };
  }
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.BUSINESS_CATEGORY.CREATE_BUSINESS_CATEGORY,
    payload
  );
};

export const getAllBusinessCategories = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.BUSINESS_CATEGORY.GET_ALL_BUSINESS_CATEGORIES,
    req.query
  );

export const getBusinessCategoryById = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.BUSINESS_CATEGORY.GET_BUSINESS_CATEGORY_BY_ID,
    { id: req.params.id }
  );

export const updateBusinessCategory = (req, res) => {
  const payload = { ...req.body, id: req.params.id };
  if (req.files?.bannerImage?.[0]) {
    payload.file = {
      bannerImage: [
        {
          buffer: req.files.bannerImage[0].buffer.toString("base64"),
          mimetype: req.files.bannerImage[0].mimetype,
          originalname: req.files.bannerImage[0].originalname,
        },
      ],
    };
  }
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.BUSINESS_CATEGORY.UPDATE_BUSINESS_CATEGORY,
    payload
  );
};

export const deleteBusinessCategory = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.BUSINESS_CATEGORY.DELETE_BUSINESS_CATEGORY,
    { id: req.params.id }
  );

export const updateBusinessCategoryStatus = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.BUSINESS_CATEGORY.UPDATE_STATUS, {
    id: req.params.id,
    status: req.body.status,
  });
