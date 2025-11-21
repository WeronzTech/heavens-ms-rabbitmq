import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  addMerchantDetails,
  approveMerchant,
  blockMerchant,
  updateMerchant,
  deleteMerchant,
  getMerchantByShopOwnerId,
  getMerchantById,
  updateShopStatus,
  getAllMerchants,
  getMerchantsByBusinessCategory,
} from "../services/merchant.service.js";

createResponder(ORDER_PATTERN.MERCHANT.ADD_MERCHANT_DETAILS, async (data) => {
  return await addMerchantDetails(data);
});

createResponder(ORDER_PATTERN.MERCHANT.APPROVE_MERCHANT, async (data) => {
  return await approveMerchant(data);
});

createResponder(ORDER_PATTERN.MERCHANT.BLOCK_MERCHANT, async (data) => {
  return await blockMerchant(data);
});

createResponder(ORDER_PATTERN.MERCHANT.UPDATE_MERCHANT, async (data) => {
  return await updateMerchant(data);
});

createResponder(ORDER_PATTERN.MERCHANT.DELETE_MERCHANT, async (data) => {
  return await deleteMerchant(data);
});

createResponder(
  ORDER_PATTERN.MERCHANT.GET_MERCHANT_BY_SHOPOWNER,
  async (data) => {
    return await getMerchantByShopOwnerId(data);
  }
);

createResponder(ORDER_PATTERN.MERCHANT.GET_MERCHANT_BY_ID, async (data) => {
  return await getMerchantById(data);
});

createResponder(ORDER_PATTERN.MERCHANT.UPDATE_SHOP_STATUS, async (data) => {
  return await updateShopStatus(data);
});

createResponder(ORDER_PATTERN.MERCHANT.GET_ALL_MERCHANTS, async (data) => {
  return await getAllMerchants(data);
});

createResponder(
  ORDER_PATTERN.MERCHANT.GET_MERCHANTS_BY_BUSINESS_CATEGORY,
  async (data) => {
    return await getMerchantsByBusinessCategory(data);
  }
);
