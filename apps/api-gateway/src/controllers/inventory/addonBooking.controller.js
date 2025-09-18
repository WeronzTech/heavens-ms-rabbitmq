import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { INVENTORY_PATTERN } from "../../../../../libs/patterns/inventory/inventory.pattern.js";

const handleRPCAndRespond = async (res, pattern, data) => {
  try {
    const response = await sendRPCRequest(pattern, data);
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error(`API Gateway Error in ${pattern}:`, error);
    return res
      .status(500)
      .json({ message: "Internal Server Error in API Gateway." });
  }
};

export const createAddonBooking = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON_BOOKING.CREATE, req.body);

export const getAddonBookingsByProperty = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.ADDON_BOOKING.GET_BY_PROPERTY,
    req.query
  );

export const getAddonBookingsForUser = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON_BOOKING.GET_FOR_USER, {
    ...req.query,
    userId: req.params.userId,
  });

export const getAddonBookingById = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON_BOOKING.GET_BY_ID, {
    bookingId: req.params.bookingId,
  });

export const updateAddonBookingStatus = (req, res) =>
  handleRPCAndRespond(res, INVENTORY_PATTERN.ADDON_BOOKING.UPDATE_STATUS, {
    ...req.body,
    bookingId: req.params.bookingId,
  });
