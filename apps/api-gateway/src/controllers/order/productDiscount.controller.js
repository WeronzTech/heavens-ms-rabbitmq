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

export const createProductDiscount = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT_DISCOUNT.CREATE_DISCOUNT,
    req.body
  );

export const getAllProductDiscounts = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.PRODUCT_DISCOUNT.GET_ALL_DISCOUNTS,
    req.query
  );

export const getProductDiscountById = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.PRODUCT_DISCOUNT.GET_DISCOUNT_BY_ID, {
    id: req.params.id,
  });

export const updateProductDiscount = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.PRODUCT_DISCOUNT.UPDATE_DISCOUNT, {
    id: req.params.id,
    ...req.body,
  });

export const deleteProductDiscount = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.PRODUCT_DISCOUNT.DELETE_DISCOUNT, {
    id: req.params.id,
  });

export const updateProductDiscountStatus = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.PRODUCT_DISCOUNT.UPDATE_STATUS, {
    id: req.params.id,
    status: req.body.status,
  });
