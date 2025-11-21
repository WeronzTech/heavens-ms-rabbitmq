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

export const createDeliveryCharge = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.DELIVERY_CHARGE.CREATE_DELIVERY_CHARGE,
    req.body
  );

export const getDeliveryChargeByMerchant = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.DELIVERY_CHARGE.GET_DELIVERY_CHARGE_BY_MERCHANT,
    { merchantId: req.params.merchantId }
  );

export const updateDeliveryCharge = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.DELIVERY_CHARGE.UPDATE_DELIVERY_CHARGE,
    { id: req.params.id, ...req.body }
  );

export const deleteDeliveryCharge = (req, res) =>
  handleRPCAndRespond(
    res,
    ORDER_PATTERN.DELIVERY_CHARGE.DELETE_DELIVERY_CHARGE,
    { id: req.params.id }
  );
