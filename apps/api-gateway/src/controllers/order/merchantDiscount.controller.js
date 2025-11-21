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

export const createMerchantDiscount = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.MERCHANT_DISCOUNT.CREATE_DISCOUNT,
    req.body
  );

export const getAllMerchantDiscounts = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.MERCHANT_DISCOUNT.GET_ALL_DISCOUNTS,
    req.query
  );

export const getMerchantDiscountById = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.MERCHANT_DISCOUNT.GET_DISCOUNT_BY_ID, {
    id: req.params.id,
  });

export const updateMerchantDiscount = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.MERCHANT_DISCOUNT.UPDATE_DISCOUNT, {
    id: req.params.id,
    ...req.body,
  });

export const deleteMerchantDiscount = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.MERCHANT_DISCOUNT.DELETE_DISCOUNT, {
    id: req.params.id,
  });

export const updateMerchantDiscountStatus = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.MERCHANT_DISCOUNT.UPDATE_STATUS, {
    id: req.params.id,
    status: req.body.status,
  });
