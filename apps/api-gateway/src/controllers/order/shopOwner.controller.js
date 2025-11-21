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

export const registerShopOwner = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.SHOP_OWNER.REGISTER, req.body);

export const loginShopOwner = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.SHOP_OWNER.LOGIN, req.body);

export const logoutShopOwner = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.SHOP_OWNER.LOGOUT, {
    userId: req.userAuth,
  });

export const refreshToken = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.SHOP_OWNER.REFRESH_TOKEN, req.body);

export const getShopOwnerProfile = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.SHOP_OWNER.GET_PROFILE, {
    userId: req.userAuth,
  });

export const updateShopOwnerProfile = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.SHOP_OWNER.UPDATE_PROFILE, {
    userId: req.userAuth,
    ...req.body,
  });

export const forgotPassword = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.SHOP_OWNER.FORGOT_PASSWORD, req.body);

export const resetPassword = (req, res) =>
  handleRPCAndRespond(res, ORDER_PATTERN.SHOP_OWNER.RESET_PASSWORD, req.body);
