import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  registerShopOwner,
  loginShopOwner,
  refreshAccessToken,
  getShopOwnerProfile,
  updateShopOwnerProfile,
  forgotPassword,
  resetPassword,
} from "../services/shopOwner.service.js";

createResponder(ORDER_PATTERN.SHOP_OWNER.REGISTER, async (data) => {
  return await registerShopOwner(data);
});

createResponder(ORDER_PATTERN.SHOP_OWNER.LOGIN, async (data) => {
  return await loginShopOwner(data);
});

createResponder(ORDER_PATTERN.SHOP_OWNER.REFRESH_TOKEN, async (data) => {
  return await refreshAccessToken(data);
});

createResponder(ORDER_PATTERN.SHOP_OWNER.GET_PROFILE, async (data) => {
  return await getShopOwnerProfile(data);
});

createResponder(ORDER_PATTERN.SHOP_OWNER.UPDATE_PROFILE, async (data) => {
  return await updateShopOwnerProfile(data);
});

createResponder(ORDER_PATTERN.SHOP_OWNER.FORGOT_PASSWORD, async (data) => {
  return await forgotPassword(data);
});

createResponder(ORDER_PATTERN.SHOP_OWNER.RESET_PASSWORD, async (data) => {
  return await resetPassword(data);
});
