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

export const addMerchantDetails = (req, res) => {
  const payload = { ...req.body };

  // Handle multiple files
  payload.file = {};
  const fileFields = [
    "merchantImage",
    "pancardImage",
    "GSTINImage",
    "FSSAIImage",
    "aadharImage",
  ];

  fileFields.forEach((field) => {
    if (req.files?.[field]?.[0]) {
      payload.file[field] = [
        {
          buffer: req.files[field][0].buffer.toString("base64"),
          mimetype: req.files[field][0].mimetype,
          originalname: req.files[field][0].originalname,
        },
      ];
    }
  });

  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.MERCHANT.ADD_MERCHANT_DETAILS,
    payload
  );
};

export const updateMerchant = (req, res) => {
  const payload = { ...req.body, merchantId: req.params.id };

  payload.file = {};
  const fileFields = [
    "merchantImage",
    "pancardImage",
    "GSTINImage",
    "FSSAIImage",
    "aadharImage",
  ];

  fileFields.forEach((field) => {
    if (req.files?.[field]?.[0]) {
      payload.file[field] = [
        {
          buffer: req.files[field][0].buffer.toString("base64"),
          mimetype: req.files[field][0].mimetype,
          originalname: req.files[field][0].originalname,
        },
      ];
    }
  });

  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.MERCHANT.UPDATE_MERCHANT,
    payload
  );
};

export const approveMerchant = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.MERCHANT.APPROVE_MERCHANT, {
    merchantId: req.params.id,
    status: req.body.status,
  });
};

export const blockMerchant = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.MERCHANT.BLOCK_MERCHANT, {
    merchantId: req.params.id,
    ...req.body,
  });
};

export const deleteMerchant = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.MERCHANT.DELETE_MERCHANT, {
    merchantId: req.params.id,
  });
};

export const getMerchantByShopOwner = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.MERCHANT.GET_MERCHANT_BY_SHOPOWNER,
    { shopOwnerId: req.params.shopOwnerId }
  );
};

export const getMerchantById = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.MERCHANT.GET_MERCHANT_BY_ID, {
    merchantId: req.params.id,
  });
};

export const updateShopStatus = (req, res) => {
  return handleRPCAndRespond(res, ORDER_PATTERN.MERCHANT.UPDATE_SHOP_STATUS, {
    merchantId: req.params.id,
    isOpen: req.body.isOpen,
  });
};

export const getAllMerchants = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.MERCHANT.GET_ALL_MERCHANTS,
    req.query
  );
};

export const getMerchantsByBusinessCategory = (req, res) => {
  return handleRPCAndRespond(
    res,
    ORDER_PATTERN.MERCHANT.GET_MERCHANTS_BY_BUSINESS_CATEGORY,
    req.query
  );
};
