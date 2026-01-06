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

const createMealBooking = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.BOOKING.CREATE_MEAL_BOOKING,
      req.body
    );
    if (response.status === 201) {
      return res.status(201).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("API Gateway Error in createMealBooking:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.BOOKING.GET_BOOKING_BY_ID,
      {
        bookingId,
      }
    );
    if (response.status === 200) {
      return res.status(200).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("API Gateway Error in getBookingById:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

const getBookingByProperty = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.BOOKING.GET_BOOKINGS_BY_PROPERTY,
      req.query
    );
    if (response.status === 200) {
      return res.status(200).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("API Gateway Error in getBookingByProperty:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, status } = req.query;
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.BOOKING.GET_USER_BOOKINGS,
      {
        userId,
        date,
        status,
      }
    );
    if (response.status === 200) {
      return res.status(200).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("API Gateway Error in getUserBookings:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.BOOKING.UPDATE_BOOKING_STATUS,
      {
        bookingId,
        status,
      }
    );
    if (response.status === 200) {
      return res.status(200).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("API Gateway Error in updateBookingStatus:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.BOOKING.DELETE_BOOKING,
      {
        bookingId,
      }
    );
    if (response.status === 200) {
      return res.status(200).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("API Gateway Error in deleteBooking:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

const checkNextDayBooking = async (req, res) => {
  try {
    const userId = req.userAuth;
    const { today } = req.query;
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.BOOKING.CHECK_NEXT_DAY_BOOKING,
      {
        userId,
        today,
      }
    );
    if (response.status === 200) {
      return res.status(200).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("API Gateway Error in checkNextDayBooking:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

export const createManualMealBookings = (req, res) =>
  handleRPCAndRespond(
    res,
    INVENTORY_PATTERN.BOOKING.MANUAL_CREATE_BOOKINGS,
    req.body
  );

export const getUsageForPreparation = async (req, res) => {
  try {
    const { date } = req.query;

    // Validate that the date parameter is provided
    if (!date) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "The 'date' query parameter is required.",
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Invalid date format. Please use YYYY-MM-DD.",
      });
    }

    // Send a request to the inventory microservice via RabbitMQ
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.BOOKING.GET_USAGE_OF_INVENTORY,
      { date }
    );

    // Respond to the client based on the microservice's response
    if (response.status === 200) {
      return res.status(200).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("API Gateway Error in getUsageForPreparation:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

const createTokenMealBooking = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      INVENTORY_PATTERN.BOOKING.MANUAL_CREATE_TOKEN_BOOKINGS,
      req.body // Expecting { userId } in body
    );
    if (response.status === 201) {
      return res.status(201).json(response);
    } else {
      return res.status(response.status || 500).json(response);
    }
  } catch (error) {
    console.error("API Gateway Error in createTokenMealBooking:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error in API Gateway.",
    });
  }
};

export {
  createMealBooking,
  getBookingById,
  getBookingByProperty,
  getUserBookings,
  updateBookingStatus,
  deleteBooking,
  checkNextDayBooking,
  createTokenMealBooking,
};
