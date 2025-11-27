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
import {
  createRazorpayOrderId,
  verifyPayment,
} from "../../../../libs/common/razorpay.js";

export const createAddonBooking = async (data) => {
  try {
    const tomorrow = getTomorrowDate();
    const bookingData = {
      ...data,
      bookingDate: data.bookingDate || tomorrow,
      deliveryDate: data.deliveryDate || tomorrow,
    };
    const { userId, addons } = bookingData;
    console.log("bookingData", bookingData);

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
    if (!userResponse.body.success) {
      return {
        success: false,
        status: 404,
        message: "Could not find user details to create booking.",
      };
    }
    const userDetails = userResponse.body.data;
    const propertyId = userDetails?.stayDetails?.propertyId;

    const property = await sendRPCRequest(
      PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
      {
        id: propertyId,
      }
    );
    if (!property || !property?.data.kitchenId) {
      return {
        success: false,
        status: 404,
        message: "Property or associated kitchen not found.",
      };
    }

    const kitchenId = property?.data.kitchenId;

    let keyId = null;
    let keySecret = null;
    if (
      property.success &&
      property.data?.razorpayCredentials?.keyId &&
      property.data?.razorpayCredentials?.keySecret
    ) {
      keyId = property.data.razorpayCredentials.keyId;
      keySecret = property.data.razorpayCredentials.keySecret;
    }

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
      const totalPrice = addon.discountedPrice * item.quantity;
      grandTotalPrice += totalPrice;
      processedAddons.push({ ...item, totalPrice });
    }

    const paymentResponse = await createRazorpayOrderId(
      grandTotalPrice,
      keyId,
      keySecret
    );

    if (!paymentResponse.success) {
      return {
        success: false,
        status: 500,
        message: "Failed to create Razorpay Order.",
        error: paymentResponse.error,
      };
    }

    const { orderId: razorpayOrderId } = paymentResponse;

    const newBooking = await AddonBooking.create({
      ...bookingData,
      propertyId,
      kitchenId,
      addons: processedAddons,
      grandTotalPrice,
      razorpayOrderId,
      bookingDate: normalizeDate(bookingData.bookingDate),
      deliveryDate: normalizeDate(bookingData.deliveryDate),
    });

    return {
      success: true,
      status: 201,
      message: "Addon Booking created successfully",
      data: {
        ...newBooking.toObject(),
        // Return keyId to frontend so checkout opens with correct merchant
        keyId: keyId || process.env.RAZORPAY_KEY_ID,
      },
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

export const verifyAddonBookingPayment = async (data) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        success: false,
        status: 400,
        message: "Missing payment verification details.",
      };
    }

    const booking = await AddonBooking.findOne({
      razorpayOrderId: razorpay_order_id,
    });
    if (!booking) {
      return {
        success: false,
        status: 404,
        message: "No booking found with the given order ID.",
      };
    }

    let keySecret = null;
    if (booking.propertyId) {
      try {
        const propertyResponse = await sendRPCRequest(
          PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
          { id: booking.propertyId }
        );
        if (
          propertyResponse.success &&
          propertyResponse.data?.razorpayCredentials?.keySecret
        ) {
          keySecret = propertyResponse.data.razorpayCredentials.keySecret;
        }
      } catch (err) {
        console.error(
          "Failed to fetch property credentials for verification",
          err
        );
      }
    }

    const isPaymentValid = await verifyPayment(
      {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
      keySecret
    );

    if (!isPaymentValid) {
      await AddonBooking.findByIdAndDelete(booking._id);

      return {
        success: false,
        status: 400,
        message: "Payment verification failed. Signature mismatch.",
      };
    }

    const finalizedBooking = await AddonBooking.findByIdAndUpdate(
      booking._id,
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "Pending",
        paymentStatus: "Paid",
        deliveredDate: null,
      },
      { new: true }
    );

    const kitchen = await Kitchen.findById(booking?.kitchenId).lean();
    const propertyResponse = await sendRPCRequest(
      PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
      { id: booking?.propertyId }
    );
    const userIdsToNotify = ["688722e075ee06d71c8fdb02"]; // Admin ID
    if (kitchen?.incharge) userIdsToNotify.push(kitchen.incharge.toString());
    if (propertyResponse.success && propertyResponse.data?.clientId) {
      userIdsToNotify.push(propertyResponse.data.clientId);
    }
    const socket = await sendRPCRequest(SOCKET_PATTERN.EMIT, {
      userIds: userIdsToNotify,
      event: "new-addon-booking",
      data: finalizedBooking,
    });

    return {
      success: true,
      status: 201,
      message: "Addon Booking created successfully and payment verified.",
      data: finalizedBooking,
    };
  } catch (error) {
    console.error("Verify Addon Payment Service Error:", error);
    return {
      success: false,
      status: 500,
      message: error.message,
    };
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

    const [bookings, total] = await Promise.all([
      AddonBooking.find(query)
        .populate("addons.addonId")
        .sort({ bookingDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AddonBooking.countDocuments(query),
    ]);

    const enrichedData = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const userServiceResponse = await sendRPCRequest(
            USER_PATTERN.USER.GET_USER_BY_ID,
            { userId: booking.userId }
          );

          const userDetails = userServiceResponse?.body?.data;

          return {
            ...booking,
            userName: userDetails?.name || "N/A",
            contact: userDetails?.contact || "N/A",
            roomNumber: userDetails?.stayDetails?.roomNumber || "N/A",
          };
        } catch {
          return {
            ...booking,
            userName: "User not found",
            roomNumber: "N/A",
            contact: "N/A",
          };
        }
      })
    );

    // ✅ NEW SECTION: Calculate today's statistics
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // e.g., "2025-10-17"

    // Filter today's bookings
    const todayBookings = enrichedData.filter((b) => {
      const bookingDateStr = new Date(b.bookingDate)
        .toISOString()
        .split("T")[0];
      return bookingDateStr === todayStr;
    });

    // Total bookings today
    const todayBookingCount = todayBookings.length;

    // Count by status
    const deliveredCount = todayBookings.filter(
      (b) => b.status === "Delivered"
    ).length;
    const pendingCount = todayBookings.filter(
      (b) => b.status === "Pending"
    ).length;

    // Total amount for today's delivered bookings
    const todayDeliveredTotal = todayBookings
      .filter((b) => b.status === "Delivered")
      .reduce((sum, b) => sum + (Number(b.grandTotalPrice) || 0), 0);

    const responsePayload = {
      data: enrichedData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      // ✅ Added statistics
      todayBookingCount,
      deliveredCount,
      pendingCount,
      todayDeliveredTotal,
    };

    return {
      success: true,
      status: 200,
      data: responsePayload,
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
