import mongoose from "mongoose";
import { MealBooking } from "../models/mealBooking.model.js";
import {
  getTomorrowDate,
  normalizeDate,
  validateRequired,
} from "../utils/helpers.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { SOCKET_PATTERN } from "../../../../libs/patterns/socket/socket.pattern.js";
import moment from "moment";
// Note: You might replace axios with sendRPCRequest for inter-service communication

export const createMealBooking = async (data) => {
  try {
    const { userId, mealType, menuId } = data;

    validateRequired(userId, "User ID");
    validateRequired(mealType, "Meal Type");

    const bookingDate = getTomorrowDate();
    const normalizedDate = normalizeDate(bookingDate);

    let userDetails;
    try {
      // It's better to use RPC for inter-service communication
      const userResponse = await sendRPCRequest(
        USER_PATTERN.USER.GET_USER_BY_ID,
        { userId }
      );
      userDetails = userResponse.body.data;
    } catch (error) {
      console.error("Failed to fetch user details:", error.message);
      return {
        success: false,
        status: 404,
        message: "Could not find user details to create booking.",
      };
    }

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

    const existingBooking = await MealBooking.findOne({
      userId,
      propertyId,
      kitchenId,
      bookingDate: normalizedDate,
      mealType,
    });

    if (existingBooking) {
      return {
        success: false,
        status: 409,
        message: `A booking for ${mealType} on this date already exists.`,
      };
    }

    const booking = await MealBooking.create({
      userId,
      propertyId,
      kitchenId,
      bookingDate: normalizedDate,
      mealType,
      menuId,
    });

    return {
      success: true,
      status: 201,
      message: "Booking created successfully",
      data: booking,
    };
  } catch (error) {
    console.error("Error creating meal booking:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const getBookingById = async (data) => {
  try {
    const { bookingId } = data;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return { success: false, status: 400, message: "Invalid Booking ID" };
    }
    const booking = await MealBooking.findById(bookingId).lean();
    if (!booking) {
      return { success: false, status: 404, message: "Booking not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Booking retrieved successfully",
      data: booking,
    };
  } catch (error) {
    console.error("Error getting booking by ID:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const getBookingByProperty = async (data) => {
  try {
    const {
      date,
      status,
      mealType,
      mealCategory,
      propertyId,
      page = 1,
      limit = 10,
    } = data;

    const query = {};

    // ---- Time zone handling (IST) ----
    const nowUTC = new Date();
    const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000); // convert UTC → IST

    // If current IST time is after 11:00 PM, shift by one more day
    const hoursIST = nowIST.getHours();
    const targetIST = new Date(nowIST);

    if (hoursIST >= 23) {
      targetIST.setDate(targetIST.getDate() + 2); // after 11pm → day after tomorrow
    } else {
      targetIST.setDate(targetIST.getDate() + 1); // before 11pm → tomorrow
    }

    // Normalize target to midnight IST
    targetIST.setHours(0, 0, 0, 0);

    // Convert back to UTC for Mongo
    const targetUTC = new Date(targetIST.getTime() - 5.5 * 60 * 60 * 1000);

    // Build start/end range (UTC)
    const startOfDayUTC = new Date(targetUTC);
    startOfDayUTC.setUTCHours(0, 0, 0, 0);

    const endOfDayUTC = new Date(targetUTC);
    endOfDayUTC.setUTCHours(23, 59, 59, 999);

    // ---- Query conditions ----
    if (propertyId) query.propertyId = propertyId;
    if (mealType) query.mealType = mealType;
    if (mealCategory) query.mealCategory = mealCategory;
    if (status) query.status = status;

    query.bookingDate = { $gte: startOfDayUTC, $lte: endOfDayUTC };

    // ---- Pagination ----
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookingsData, total] = await Promise.all([
      MealBooking.find(query)
        .sort({ bookingDate: 1, mealType: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MealBooking.countDocuments(query),
    ]);

    // ---- Enrich with user info ----
    const enrichedData = await Promise.all(
      bookingsData.map(async (booking) => {
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

    // ---- Response ----
    const responsePayload = {
      data: enrichedData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      targetDate: targetUTC,
    };

    return {
      success: true,
      status: 200,
      message: "Bookings retrieved successfully",
      data: responsePayload,
    };
  } catch (error) {
    console.error("Error getting bookings by property:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

// export const getBookingByProperty = async (data) => {
//   try {
//     const {
//       date,
//       status,
//       mealType,
//       mealCategory,
//       propertyId,
//       page = 1,
//       limit = 10,
//     } = data;
//     const query = {};

//     if (propertyId) query.propertyId = propertyId;
//     if (date) query.bookingDate = normalizeDate(date);
//     if (mealType) query.mealType = mealType;
//     if (mealCategory) query.mealCategory = mealCategory;
//     if (status) query.status = status;

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const [bookingsData, total] = await Promise.all([
//       MealBooking.find(query)
//         .sort({ bookingDate: 1, mealType: 1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .lean(),
//       MealBooking.countDocuments(query),
//     ]);

//     const enrichedData = await Promise.all(
//       bookingsData.map(async (booking) => {
//         try {
//           const userServiceResponse = await sendRPCRequest(
//             USER_PATTERN.USER.GET_USER_BY_ID,
//             { userId: booking.userId }
//           );
//           const userDetails = userServiceResponse.body.data;
//           return {
//             ...booking,
//             userName: userDetails?.name || "N/A",
//             contact: userDetails?.contact || "N/A",
//             roomNumber: userDetails?.stayDetails?.roomNumber || "N/A",
//           };
//         } catch (error) {
//           return {
//             ...booking,
//             userName: "User not found",
//             roomNumber: "N/A",
//             contact: "N/A",
//           };
//         }
//       })
//     );

//     const responsePayload = {
//       data: enrichedData,
//       pagination: {
//         total,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(total / parseInt(limit)),
//       },
//     };

//     return {
//       success: true,
//       status: 200,
//       message: "Bookings retrieved successfully",
//       data: responsePayload,
//     };
//   } catch (error) {
//     console.error("Error getting bookings by property:", error);
//     return { success: false, status: 500, message: "Internal Server Error" };
//   }
// };

export const getUserBookings = async (data) => {
  try {
    const { userId, date, status } = data;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { success: false, status: 400, message: "Invalid User ID" };
    }
    const query = { userId: new mongoose.Types.ObjectId(userId) };
    if (date) query.bookingDate = normalizeDate(date);
    if (status) query.status = status;

    const bookings = await MealBooking.find(query)
      .sort({ bookingDate: -1 })
      .lean();

    return {
      success: true,
      status: 200,
      message: "User bookings retrieved successfully",
      data: bookings,
    };
  } catch (error) {
    console.error("Error getting user bookings:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const updateBookingStatus = async (data) => {
  try {
    const { bookingId, status } = data;
    // if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    //   return { success: false, status: 400, message: "Invalid booking ID" };
    // }
    const validStatuses = ["Pending", "Delivered", "Cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return {
        success: false,
        status: 400,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      };
    }
    const booking = await MealBooking.find({ orderId: bookingId });
    if (!booking) {
      return { success: false, status: 404, message: "Booking not found" };
    }
    if (booking.status === "Delivered" || booking.status === "Cancelled") {
      return {
        success: false,
        status: 400,
        message: `Cannot change status of a booking that is already ${booking.status}.`,
      };
    }
    booking.status = status;
    if (status === "Delivered") {
      booking.deliveredDate = new Date();
    }
    await booking.save();

    const userIdsToNotify = ["688722e075ee06d71c8fdb02"];

    userIdsToNotify.push(booking.userId);

    const socket = await sendRPCRequest(SOCKET_PATTERN.EMIT, {
      userIds: userIdsToNotify,
      event: "booking-status",
      data: booking,
    });

    return {
      success: true,
      status: 200,
      message: "Booking status updated successfully",
      data: booking,
    };
  } catch (error) {
    console.error("Error updating booking status:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const deleteBooking = async (data) => {
  try {
    const { bookingId } = data;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return { success: false, status: 400, message: "Invalid Booking ID" };
    }
    const deletedBooking = await MealBooking.findByIdAndDelete(bookingId);
    if (!deletedBooking) {
      return { success: false, status: 404, message: "Booking not found" };
    }
    return {
      success: true,
      status: 200,
      message: "Booking deleted successfully",
      data: {},
    };
  } catch (error) {
    console.error("Error deleting booking:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const checkNextDayBooking = async (data) => {
  try {
    const { userId, today } = data;
    if (!userId) {
      return {
        success: false,
        status: 401,
        message: "User not authenticated.",
      };
    }

    const targetDate = new Date();
    if (today !== "true") {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const dayOfWeek = targetDate.toLocaleString("en-US", { weekday: "long" });
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    console.log(
      "-------------------------Checking bookings for date:",
      startOfDay,
      endOfDay,
      today
    );

    const bookings = await MealBooking.find({
      userId,
      bookingDate: { $gte: startOfDay, $lt: endOfDay },
    })
      .populate({
        path: "menuId",
        select: "bookingStartTime bookingEndTime mealTimes menu",
        populate: { path: "menu.meals.itemIds", select: "name" },
      })
      .select("orderId mealType menuId status bookingDate");

    const hasBooking = bookings && bookings.length > 0;
    let message = hasBooking
      ? "Booking details retrieved successfully."
      : "No booking found for the specified day.";

    const bookingDetails = bookings.map((booking) => {
      const dayMenu = booking.menuId?.menu?.find(
        (item) => item.dayOfWeek === dayOfWeek
      );
      const specificMealItems = dayMenu?.meals?.find(
        (meal) => meal.mealType === booking.mealType
      );
      const mealTimeInfo = booking.menuId?.mealTimes?.find(
        (time) => time.mealType === booking.mealType
      );
      return {
        orderId: booking.orderId,
        mealType: booking.mealType,
        status: booking.status,
        menu: specificMealItems?.itemIds || [],
        bookingDate: booking.bookingDate,
        menuId: booking.menuId?._id,
        bookingStartTime: booking.menuId?.bookingStartTime,
        bookingEndTime: booking.menuId?.bookingEndTime,
        mealTimes: mealTimeInfo,
      };
    });

    return {
      success: true,
      status: 200,
      message,
      data: { hasBooking, bookingDetails },
    };
  } catch (error) {
    console.error("Error checking next day booking:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const createManualMealBookings = async (data) => {
  try {
    const { count, propertyId, kitchenId, mealType, bookingDate, menuId } =
      data;

    if (
      !count ||
      count <= 0 ||
      !propertyId ||
      !kitchenId ||
      !mealType ||
      !bookingDate ||
      !menuId
    ) {
      return {
        success: false,
        status: 400,
        message:
          "Count, propertyId, kitchenId, mealType, menuId, and bookingDate are required.",
      };
    }

    // 2. Create booking documents in a loop
    const bookingPromises = [];
    const normalizedDate = normalizeDate(bookingDate);

    for (let i = 0; i < count; i++) {
      const newBookingData = {
        userId: new mongoose.Types.ObjectId(), // Use a new random ObjectId
        propertyId,
        kitchenId,
        bookingDate: normalizedDate,
        mealType,
        menuId,
        status: "Pending",
        remarks: "Manual booking created by kitchen staff",
      };
      // Using .create() triggers the 'save' hook for each document
      bookingPromises.push(MealBooking.create(newBookingData));
    }

    // 3. Insert all bookings in a single database operation for efficiency
    const createdBookings = await Promise.all(bookingPromises);

    return {
      success: true,
      status: 201,
      message: `${createdBookings.length} manual bookings created successfully.`,
      data: { count: createdBookings.length },
    };
  } catch (error) {
    console.error("Error creating manual meal bookings:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
