import mongoose from "mongoose";
import User from "../models/user.model.js";
import { removeFromRoom } from "./property.service.js";

export const getUserByEmail = async (email) => {
  try {
    if (!email) {
      return {
        success: false,
        status: 400,
        message: "Email is required.",
      };
    }

    const user = await User.findOne({ email });

    if (user) {
      return {
        success: true,
        status: 200,
        message: "User found successfully.",
        data: user,
      };
    } else {
      return {
        success: false,
        status: 404,
        message: "User with this email does not exist.",
      };
    }
  } catch (error) {
    console.error("Error in getUserByEmail service:", error);
    return {
      success: false,
      status: 500,
      message: "An internal server error occurred while fetching the user.",
    };
  }
};

export const vacateUserById = async (userId) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw { status: 404, message: "Resident not found" };
    }

    if (user.paymentStatus === "pending") {
      throw {
        status: 400,
        message: "Clear payment before vacating!",
      };
    }

    if (
      user.rentType === "monthly" &&
      user.stayDetails.depositStatus === "pending"
    ) {
      throw {
        status: 400,
        message: "Clear deposit payment before vacating!",
      };
    }

    const currentRoomId = user.stayDetails?.roomId;
    const currentPropertyId = user.propertyId;

    if (currentRoomId) {
      await removeFromRoom(user._id, currentRoomId);
    }

    user.isVacated = true;
    user.vacatedAt = new Date();
    user.currentStatus = "checked_out";
    user.stayDetails.roomId = null;
    user.isLoginEnabled = false;
    await user.save({ session });
    console.log("rrrrrrr");

    console.log(user);
    console.log("rrrrrrr");

    await session.commitTransaction();
    return {
      userId: user._id,
      name: user.name,
      propertyName: user.stayDetails?.propertyName || null,
      propertyId: user.stayDetails?.propertyId || null,
      kitchenName: user.messDetails.kitchenName || null,
      kitchenId: user.messDetails?.kitchenId || null,
      vacatedAt: user.vacatedAt,
      previousRoom: currentRoomId
        ? {
            roomId: currentRoomId,
            propertyId: currentPropertyId,
          }
        : null,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
