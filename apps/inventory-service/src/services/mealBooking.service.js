import mongoose from "mongoose";
import axios from "axios";
import { MealBooking } from "../models/mealBooking.model.js";
import {
  getTomorrowDate,
  normalizeDate,
  validateRequired,
} from "../utils/helpers.js";
// Note: You might replace axios with sendRPCRequest for inter-service communication
// import { sendRPCRequest } from "../../../libs/common/rabbitMq.js";
// import { USER_PATTERN } from "../../../libs/patterns/user/user.pattern.js";

// export const createMealBooking = async (data) => {
//   try {
//     const { userId, mealType, menuId } = data;

//     validateRequired(userId, "User ID");
//     validateRequired(mealType, "Meal Type");

//     const bookingDate = getTomorrowDate();
//     const normalizedDate = normalizeDate(bookingDate);

//     let userDetails;
//     try {
//       // It's better to use RPC for inter-service communication
//       // const userResponse = await sendRPCRequest(USER_PATTERN.USER.GET_USER_BY_ID, { userId });
//       // userDetails = userResponse.data;
//       const response = await axios.get(
//         `${process.env.USER_SERVICE_URL}/user/${userId}`
//       );
//       userDetails = response.data;
//     } catch (error) {
//       console.error("Failed to fetch user details:", error.message);
//       return {
//         success: false,
//         status: 404,
//         message: "Could not find user details to create booking.",
//       };
//     }

//     const propertyId = userDetails?.stayDetails?.propertyId;
//     const kitchenId =
//       userDetails?.messDetails?.kitchenId || userDetails?.stayDetails?.kitchenId;

//     if (!propertyId) {
//       return {
//         success: false,
//         status: 400,
//         message: "User is not associated with a property. Cannot create booking.",
//       };
//     }

//     const existingBooking = await MealBooking.findOne({
//       userId,
//       propertyId,
//       kitchenId,
//       bookingDate: normalizedDate,
//       mealType,
//     });

//     if (existingBooking) {
//       return {
//         success: false,
//         status: 409,
//         message: `A booking for ${mealType} on this date already exists.`,
//       };
//     }

//     const booking = await MealBooking.create({
//       userId,
//       propertyId,
//       kitchenId,
//       bookingDate: normalizedDate,
//       mealType,
//       menuId,
//     });

//     return {
//       success: true,
//       status: 201,
//       message: "Booking created successfully",
//       data: booking,
//     };
//   } catch (error) {
//     console.error("Error creating meal booking:", error);
//     return {
//       success: false,
//       status: 500,
//       message: "Internal Server Error",
//     };
//   }
// };

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

    if (propertyId) query.propertyId = propertyId;
    if (date) query.bookingDate = normalizeDate(date);
    if (mealType) query.mealType = mealType;
    if (mealCategory) query.mealCategory = mealCategory;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookingsData, total] = await Promise.all([
      MealBooking.find(query)
        .sort({ bookingDate: 1, mealType: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MealBooking.countDocuments(query),
    ]);

    const enrichedData = await Promise.all(
      bookingsData.map(async (booking) => {
        try {
          const userServiceResponse = await axios.get(
            `${process.env.USER_SERVICE_URL}/user/${booking.userId}`
          );
          const userDetails = userServiceResponse.data;
          return {
            ...booking,
            userName: userDetails?.name || "N/A",
            contact: userDetails?.contact || "N/A",
            roomNumber: userDetails?.stayDetails?.roomNumber || "N/A",
          };
        } catch (error) {
          return {
            ...booking,
            userName: "User not found",
            roomNumber: "N/A",
            contact: "N/A",
          };
        }
      })
    );

    const responsePayload = {
      data: enrichedData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };

    return {
      success: true,
      status: 200,
      message: "Bookings retrieved successfully",
      data: responsePayload,
    };
  } catch (error) {
    console.error("Error getting bookings by property:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

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
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return { success: false, status: 400, message: "Invalid booking ID" };
    }
    const validStatuses = ["Pending", "Delivered", "Cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return {
        success: false,
        status: 400,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      };
    }
    const booking = await MealBooking.findById(bookingId);
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
