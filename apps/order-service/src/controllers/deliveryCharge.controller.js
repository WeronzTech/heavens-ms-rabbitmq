import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ORDER_PATTERN } from "../../../../libs/patterns/order/order.pattern.js";
import {
  createDeliveryCharge,
  getDeliveryChargeByMerchant,
  updateDeliveryCharge,
  deleteDeliveryCharge,
} from "../services/deliveryCharge.service.js";

createResponder(
  ORDER_PATTERN.DELIVERY_CHARGE.CREATE_DELIVERY_CHARGE,
  async (data) => {
    return await createDeliveryCharge(data);
  }
);

createResponder(
  ORDER_PATTERN.DELIVERY_CHARGE.GET_DELIVERY_CHARGE_BY_MERCHANT,
  async (data) => {
    return await getDeliveryChargeByMerchant(data);
  }
);

createResponder(
  ORDER_PATTERN.DELIVERY_CHARGE.UPDATE_DELIVERY_CHARGE,
  async (data) => {
    return await updateDeliveryCharge(data);
  }
);

createResponder(
  ORDER_PATTERN.DELIVERY_CHARGE.DELETE_DELIVERY_CHARGE,
  async (data) => {
    return await deleteDeliveryCharge(data);
  }
);
