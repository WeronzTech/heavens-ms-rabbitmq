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
import { UsageForPreparation } from "../models/usageForPreparation.model.js";
// Note: You might replace axios with sendRPCRequest for inter-service communication

export const createMealBooking = async (data) => {
  try {
    const { userId, mealType, menuId, partnerName } = data;
    console.log(data);
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

    let existingBooking;

    if (!partnerName) {
      existingBooking = await MealBooking.findOne({
        userId,
        propertyId,
        kitchenId,
        bookingDate: normalizedDate,
        mealType,
        $or: [
          { partnerName: null },
          { partnerName: "" },
          { partnerName: { $exists: false } },
        ],
      });
      console.log("herererererer");

      console.log(existingBooking);
      if (existingBooking) {
        return {
          success: false,
          status: 409,
          message: `A booking for ${mealType} already exists for the user.`,
        };
      }
    }

    const booking = await MealBooking.create({
      userId,
      partnerName,
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
    console.log("Error creating meal booking:", error);
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
      status,
      mealType,
      mealCategory,
      propertyId,
      bookingDate,
      search,
      todayOnly,
      // page = 1,
      // limit = 10,
    } = data;

    const query = {};

    // Convert string boolean → real boolean
    const isTodayOnly = todayOnly === true || todayOnly === "true";

    // --------------------------------------------------
    // DATE FILTER LOGIC
    // --------------------------------------------------
    if (isTodayOnly) {
      const nowUTC = new Date();
      const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);
      const hoursIST = nowIST.getHours();
      const targetIST = new Date(nowIST);

      if (hoursIST >= 23) targetIST.setDate(targetIST.getDate() + 2);
      else targetIST.setDate(targetIST.getDate() + 1);

      targetIST.setHours(0, 0, 0, 0);

      const targetUTC = new Date(targetIST.getTime() - 5.5 * 60 * 60 * 1000);

      query.bookingDate = {
        $gte: new Date(targetUTC.setUTCHours(0, 0, 0, 0)),
        $lte: new Date(targetUTC.setUTCHours(23, 59, 59, 999)),
      };
    } else if (bookingDate) {
      const dateObj = new Date(bookingDate + "T00:00:00.000Z");
      query.bookingDate = {
        $gte: new Date(dateObj.setUTCHours(0, 0, 0, 0)),
        $lte: new Date(dateObj.setUTCHours(23, 59, 59, 999)),
      };
    }

    // --------------------------------------------------
    // COMMON FILTERS
    // --------------------------------------------------
    if (propertyId) query.propertyId = propertyId;
    if (mealType) query.mealType = mealType;
    if (mealCategory) query.mealCategory = mealCategory;
    if (status) query.status = status;

    // --------------------------------------------------
    // FETCH BOOKINGS
    // --------------------------------------------------
    // const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookingsData = await MealBooking.find(query)
      .sort({ bookingDate: 1, mealType: 1 })
      // .skip(skip)
      // .limit(parseInt(limit))
      .lean();

    const total = await MealBooking.countDocuments(query);

    // --------------------------------------------------
    // 🔥 BULK USER FETCH (SUPER FAST)
    // --------------------------------------------------
    const allUserIds = [...new Set(bookingsData.map((b) => b.userId))];

    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      { userIds: allUserIds }
    );

    const usersMap = {};
    for (const u of userResponse?.body?.data || []) {
      usersMap[u.id] = u;
    }

    // --------------------------------------------------
    // ENRICH BOOKINGS (NO async, SUPER FAST)
    // --------------------------------------------------

    const userMap = {};

    await Promise.all(
      allUserIds.map(async (id) => {
        const response = await sendRPCRequest(
          USER_PATTERN.USER.GET_USER_BY_ID,
          { userId: id }
        );
        userMap[id] = response?.body?.data || {};
      })
    );

    const enrichedData = bookingsData.map((b) => {
      const user = userMap[b.userId] || {};
      return {
        ...b,
        userName: user.name || "N/A",
        contact: user.contact || "N/A",
        roomNumber: user.stayDetails?.roomNumber || "N/A",
      };
    });

    // --------------------------------------------------
    // SEARCH FILTER
    // --------------------------------------------------
    let filteredData = enrichedData;
    if (search) {
      const s = search.toLowerCase();
      filteredData = enrichedData.filter((item) => {
        return (
          item.orderId?.toLowerCase().includes(s) ||
          item.partnerName?.toLowerCase().includes(s) ||
          item.userName?.toLowerCase().includes(s)
        );
      });
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------
    return {
      success: true,
      status: 200,
      message: "Bookings retrieved successfully",
      data: {
        data: filteredData,
        // pagination: {
        //   total: filteredData.length,
        //   page: parseInt(page),
        //   limit: parseInt(limit),
        //   totalPages: Math.ceil(filteredData.length / parseInt(limit)),
        // },
        todayOnlyApplied: isTodayOnly,
      },
    };
  } catch (error) {
    console.error("Error getting bookings by property:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
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
    const booking = await MealBooking.findOne({ orderId: bookingId });
    console.log("Booking", booking);
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
    console.log(data);
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
      .select("orderId mealType menuId status bookingDate partnerName");

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
        partnerName: booking.partnerName,
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
    const { count, propertyId, kitchenId, mealType, menuId } = data;

    const bookingDate = getTomorrowDate();
    const normalizedDate = normalizeDate(bookingDate);

    if (
      !count ||
      count <= 0 ||
      !propertyId ||
      !kitchenId ||
      !mealType ||
      !menuId
    ) {
      return {
        success: false,
        status: 400,
        message: "Count, propertyId, kitchenId, mealType, menuId are required.",
      };
    }

    // 2. Create booking documents in a loop
    const bookingPromises = [];
    // const normalizedDate = normalizeDate(bookingDate);

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

export const getUsageByDate = async ({ date }) => {
  console.log(`Fetching usage for preparation data for date: ${date} (IST)`);

  try {
    // When a date string like "2025-10-18" is passed, new Date() interprets it as UTC midnight.
    const inputDate = new Date(date);

    // To create a timezone-aware range, we define the start and end in UTC that corresponds to a full day in IST.
    // IST is UTC+5:30. We get the date parts from the input as if they are UTC to avoid local server timezone interference.
    const year = inputDate.getUTCFullYear();
    const month = inputDate.getUTCMonth();
    const day = inputDate.getUTCDate();

    // Create a UTC date object for the start of the day (00:00:00) using the date parts.
    const startOfDayUTC = Date.UTC(year, month, day);

    // Subtract the IST offset (5 hours and 30 minutes in milliseconds) to get the exact start of the day in IST, represented in UTC.
    // For example, 2025-10-18 00:00:00 IST is actually 2025-10-17 18:30:00 UTC.
    const IST_OFFSET_MS = 5 * 60 * 60 * 1000 + 30 * 60 * 1000;
    const startDate = new Date(startOfDayUTC - IST_OFFSET_MS);

    // The end date is exactly 24 hours after the start date.
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    console.log("start date", startDate);
    console.log("end date", endDate);

    // Find all records where the preparationDate (stored in UTC) falls between the start and end of the day in IST.
    const usageData = await UsageForPreparation.find({
      preparationDate: {
        $gte: startDate,
        $lt: endDate,
      },
    }).lean(); // .lean() returns plain JavaScript objects for better performance

    console.log(`Found ${usageData.length} records for the specified date.`);
    return { success: true, status: 200, data: usageData };
  } catch (error) {
    console.error("Error fetching usage for preparation data:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
