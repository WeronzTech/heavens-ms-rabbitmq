import { WeeklyMenu } from "../models/messMenu.model.js";
import { validateMealTimesArray, validateMenuData } from "../utils/helpers.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";

export const createWeeklyMenu = async (data) => {
  try {
    validateMealTimesArray(data.mealTimes);
    validateMenuData(data);

    const menu = await WeeklyMenu.create(data);
    return {
      success: true,
      status: 201,
      message: "Weekly menu created successfully",
      data: menu,
    };
  } catch (error) {
    console.error("Error creating weekly menu:", error);
    return { success: false, status: 400, message: error.message };
  }
};

export const getWeeklyMenu = async (data) => {
  try {
    const { kitchenId } = data;
    const menu = await WeeklyMenu.find({ kitchenId })
      .populate({
        path: "menu.meals.itemIds",
        model: "Recipe",
      })
      .lean();

    if (!menu || menu.length === 0) {
      return {
        success: false,
        status: 404,
        message: "No weekly menu found for this kitchen.",
      };
    }

    return {
      success: true,
      status: 200,
      message: "Weekly Menu retrieved successfully",
      data: menu,
    };
  } catch (error) {
    console.error("Error getting weekly menu:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const getTodaysMenu = async (data) => {
  try {
    const { day, kitchenId } = data;
    const weeklyMenu = await WeeklyMenu.findOne({ kitchenId }).lean();
    if (!weeklyMenu) {
      return {
        success: false,
        status: 404,
        message: "Weekly menu not found for this kitchen.",
      };
    }

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const requestedDay = day
      ? day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
      : days[new Date().getDay()];

    if (!days.includes(requestedDay)) {
      return { success: false, status: 400, message: "Invalid day provided." };
    }

    const todaysMenu = weeklyMenu.menu.find(
      (d) => d.dayOfWeek === requestedDay
    );
    if (!todaysMenu) {
      return {
        success: false,
        status: 404,
        message: `No meals are scheduled for ${requestedDay}.`,
      };
    }

    const responseMenu = {
      dayOfWeek: requestedDay,
      meals: todaysMenu.meals,
      mealTimes: weeklyMenu.mealTimes,
      bookingStartTime: weeklyMenu.bookingStartTime,
      bookingEndTime: weeklyMenu.bookingEndTime,
    };

    return {
      success: true,
      status: 200,
      message: "Today's Menu retrieved successfully",
      data: responseMenu,
    };
  } catch (error) {
    console.error("Error getting today's menu:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const fetchAllPropertiesBookingTimes = async () => {
  try {
    const data = await WeeklyMenu.aggregate([
      {
        $project: {
          _id: 0,
          propertyId: 1,
          bookingStartTime: 1,
          bookingEndTime: 1,
          mealTimes: 1,
        },
      },
    ]);
    return {
      success: true,
      status: 200,
      message: "Fetched all properties and their booking times successfully",
      data,
    };
  } catch (error) {
    console.error("Error fetching booking times:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const updateWeeklyMenu = async (data) => {
  try {
    const { kitchenId, ...updates } = data;
    if (!kitchenId || !updates || Object.keys(updates).length === 0) {
      return {
        success: false,
        status: 400,
        message: "Kitchen ID and at least one field to update are required.",
      };
    }

    const updatedMenu = await WeeklyMenu.findOneAndUpdate(
      { kitchenId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedMenu) {
      return {
        success: false,
        status: 404,
        message: "No menu found for this kitchen to update.",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Weekly menu updated successfully.",
      data: updatedMenu,
    };
  } catch (error) {
    console.error("Error updating weekly menu:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const deleteWeeklyMenu = async (data) => {
  try {
    const { kitchenId } = data;
    const result = await WeeklyMenu.deleteOne({ kitchenId });
    if (result.deletedCount === 0) {
      return {
        success: false,
        status: 404,
        message: "Weekly menu not found for the given kitchen ID.",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Weekly Menu deleted successfully",
      data: {},
    };
  } catch (error) {
    console.error("Error deleting weekly menu:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const getMessMenuByPropertyId = async (data) => {
  try {
    const { userId, date: dayOfWeek } = data;

    // Replace with actual pattern names
    const userData = await sendRPCRequest(USER_PATTERN.USER.GET_USER_BY_ID, {
      userId,
    });

    let user = userData.body.data;
    if (!user || !user.stayDetails?.propertyId) {
      return {
        success: false,
        status: 404,
        message: "User or user property not found.",
      };
    }

    const property = await sendRPCRequest(
      PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
      {
        id: user.stayDetails.propertyId,
      }
    );
    if (!property || !property?.data.kitchenId) {
      return {
        success: false,
        status: 404,
        message: "Property or associated kitchen not found.",
      };
    }

    const menu = await WeeklyMenu.find(
      {
        kitchenId: property?.data.kitchenId,
        "menu.dayOfWeek": dayOfWeek,
      },
      {
        "menu.$": 1,
        mealTimes: 1,
        name: 1,
        bookingStartTime: 1,
        bookingEndTime: 1,
      }
    ).populate({
      path: "menu.meals.itemIds",
      model: "Recipe",
      select: "name",
    });

    if (!menu || menu.length === 0) {
      return {
        success: false,
        status: 200,
        message: "Menu for the specified day not found.",
      };
    }

    return {
      success: true,
      status: 200,
      message: "Mess Menu retrieved successfully",
      data: menu,
    };
  } catch (error) {
    console.error("Error getting mess menu:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};
