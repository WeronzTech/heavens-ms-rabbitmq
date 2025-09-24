import mongoose from "mongoose";
import { AddonBooking } from "../models/addonBooking.model.js";
import { Addon } from "../models/addons.model.js";
import Kitchen from "../models/kitchen.model.js";
import {
  getTomorrowDate,
  normalizeDate,
  validateObjectId,
  validateRequired,
} from "../utils/helpers.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { SOCKET_PATTERN } from "../../../../libs/patterns/socket/socket.pattern.js";

export const createAddonBooking = async (data) => {
  try {
    const tomorrow = getTomorrowDate();
    const bookingData = {
      ...data,
      bookingDate: data.bookingDate || tomorrow,
    };
    const { userId, addons } = bookingData;

    validateRequired(userId, "User ID");
    validateRequired(addons, "addons");
    validateObjectId(userId, "User ID");

    if (!Array.isArray(addons) || addons.length === 0) {
      return {
        success: false,
        status: 400,
        message: "At least one addon must be included",
      };
    }

    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      {
        userId,
      }
    );
    if (!userResponse.success) {
      return {
        success: false,
        status: 404,
        message: "Could not find user details to create booking.",
      };
    }
    const userDetails = userResponse.data;
    const propertyId = userDetails?.stayDetails?.propertyId;
    const kitchenId =
      userDetails?.messDetails?.kitchenId ||
      userDetails?.stayDetails?.kitchenId;

    if (!propertyId) {
      return {
        success: false,
        status: 400,
        message:
          "User is not associated with a property. Cannot create booking.",
      };
    }

    let grandTotalPrice = 0;
    const processedAddons = [];
    for (const item of addons) {
      const addon = await Addon.findById(item.addonId);
      if (!addon)
        return {
          success: false,
          status: 404,
          message: `Addon with ID ${item.addonId} not found.`,
        };
      const totalPrice = addon.price * item.quantity;
      grandTotalPrice += totalPrice;
      processedAddons.push({ ...item, totalPrice });
    }

    const newBooking = await AddonBooking.create({
      ...bookingData,
      propertyId,
      kitchenId,
      addons: processedAddons,
      grandTotalPrice,
      bookingDate: normalizeDate(bookingData.bookingDate),
    });

    // --- Notify relevant parties via Socket ---
    const kitchen = await Kitchen.findById(kitchenId).lean();
    const propertyResponse = await sendRPCRequest(
      PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
      { propertyId }
    );
    const userIdsToNotify = ["688722e075ee06d71c8fdb02"]; // Admin ID
    if (kitchen?.incharge) userIdsToNotify.push(kitchen.incharge.toString());
    if (propertyResponse.success && propertyResponse.data?.clientId) {
      userIdsToNotify.push(propertyResponse.data.clientId);
    }
    await sendRPCRequest(SOCKET_PATTERN.EMIT, {
      userIds: userIdsToNotify,
      event: "new-addon-booking",
      data: newBooking,
    });

    return {
      success: true,
      status: 201,
      message: "Addon Booking created successfully",
      data: newBooking,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getAddonBookingsByProperty = async (filters) => {
  try {
    const query = {};
    if (filters.propertyId) query.propertyId = filters.propertyId;
    if (filters.bookingDate)
      query.bookingDate = normalizeDate(filters.bookingDate);
    if (filters.status) query.status = filters.status;

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [bookings, totalCount] = await Promise.all([
      AddonBooking.find(query)
        .populate("addons.addonId")
        .sort({ bookingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AddonBooking.countDocuments(query),
    ]);

    const userIds = [...new Set(bookings.map((b) => b.userId.toString()))];
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      {
        userIds,
      }
    );
    const userMap = new Map(
      userResponse.success
        ? userResponse.data.map((u) => [u._id.toString(), u])
        : []
    );

    const enrichedData = bookings.map((booking) => {
      const userDetails = userMap.get(booking.userId.toString());
      return {
        ...booking,
        userName: userDetails?.name || "N/A",
      };
    });

    return {
      success: true,
      status: 200,
      data: {
        data: enrichedData,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getAddonBookingsForUser = async (filters) => {
  try {
    const { userId, page = 1, limit = 10, ...otherFilters } = filters;
    validateRequired(userId, "User ID");
    validateObjectId(userId, "User ID");

    const query = { userId: new mongoose.Types.ObjectId(userId) };
    if (otherFilters.bookingDate)
      query.bookingDate = normalizeDate(otherFilters.bookingDate);
    if (otherFilters.status) query.status = otherFilters.status;

    const skip = (page - 1) * limit;

    const [bookings, totalCount] = await Promise.all([
      AddonBooking.find(query)
        .populate("addons.addonId")
        .sort({ bookingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AddonBooking.countDocuments(query),
    ]);

    return {
      success: true,
      status: 200,
      data: {
        data: bookings,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const getAddonBookingById = async ({ bookingId }) => {
  try {
    validateRequired(bookingId, "Booking ID");
    validateObjectId(bookingId, "Booking ID");

    const booking = await AddonBooking.findById(bookingId)
      .populate("addons.addonId")
      .lean();
    if (!booking) {
      return {
        success: false,
        status: 404,
        message: "Addon Booking not found",
      };
    }
    return { success: true, status: 200, data: booking };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const updateAddonBookingStatus = async ({ bookingId, status }) => {
  try {
    validateRequired(bookingId, "Booking ID");
    validateObjectId(bookingId, "Booking ID");

    const validStatuses = ["Pending", "Delivered"];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        status: 400,
        message: `Status must be one of ${validStatuses.join(", ")}`,
      };
    }

    const booking = await AddonBooking.findById(bookingId);
    if (!booking) {
      return {
        success: false,
        status: 404,
        message: "Addon Booking not found",
      };
    }
    if (booking.status === "Delivered") {
      return {
        success: false,
        status: 400,
        message: "Booking is already marked as Delivered",
      };
    }

    booking.status = status;
    if (status === "Delivered") {
      booking.deliveredDate = new Date();
    }
    await booking.save();

    return {
      success: true,
      status: 200,
      message: "Booking status updated successfully",
      data: booking,
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};
