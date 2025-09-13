import mongoose from "mongoose";
import User from "../models/user.model.js";
import { removeFromRoom } from "./property.service.js";
import {
  checkExistingUsers,
  validateFieldFormats,
  validateRequiredFields,
} from "../utils/validators.js";
import { getNextResidentId } from "../utils/getNextResidentId.js";
import bcrypt from "bcrypt";
import UserLog from "../models/userLog.model.js";

export const getUserByEmail = async (email) => {
  console.log(email);
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

export const registerUser = async (data) => {
  try {
    const {
      userType,
      name,
      email,
      contact,
      password,
      stayDetails,
      messDetails,
      referralLink,
      isHeavens,
      personalDetails,
    } = data;

    let rentType;
    if (userType === "student" || userType === "worker") {
      rentType = "monthly";
    } else if (userType === "dailyRent") {
      rentType = "daily";
    } else if (userType === "messOnly") {
      rentType = "mess";
    }

    // 1. Required field validation
    const validationError = validateRequiredFields(
      userType,
      rentType,
      name,
      email,
      contact,
      password,
      stayDetails,
      messDetails
    );
    if (validationError) {
      return { statusCode: 400, body: validationError };
    }

    // 2. Format validation
    const formatErrors = validateFieldFormats(email, password, contact);
    if (formatErrors.length > 0) {
      return {
        statusCode: 400,
        body: {
          status: "error",
          message: "Validation errors",
          errors: formatErrors,
        },
      };
    }

    // 3. Duplicate check
    const existingUserChecks = await checkExistingUsers(email, contact);
    if (existingUserChecks.error) {
      return { statusCode: 400, body: existingUserChecks };
    }

    // 4. Resident ID + hash password
    const [residentId, hashedPassword] = await Promise.all([
      getNextResidentId(),
      bcrypt.hash(password, 10),
    ]);

    // 5. Build base user
    const userData = {
      name,
      residentId,
      email,
      contact,
      password: hashedPassword,
      userType,
      rentType,
      isVerified: false,
      isHeavens: isHeavens || false,
      personalDetails,
      referralInfo: { referredByLink: referralLink || null },
    };

    // 6. Type-specific logic
    if (userType === "messOnly") {
      userData.messDetails = {
        ...messDetails,
        messStartDate: new Date(messDetails.messStartDate),
        messEndDate: new Date(messDetails.messEndDate),
      };
      userData.financialDetails = {
        totalAmount: messDetails.rent * messDetails.noOfDays,
        pendingAmount: messDetails.rent * messDetails.noOfDays,
        accountBalance: 0,
      };
    } else if (rentType === "monthly") {
      userData.stayDetails = {
        ...stayDetails,
        joinDate: stayDetails.joinDate
          ? new Date(stayDetails.joinDate)
          : new Date(),
      };
      userData.financialDetails = {
        monthlyRent: stayDetails.monthlyRent,
        pendingRent: stayDetails.monthlyRent,
        accountBalance: 0,
        nextDueDate: new Date(stayDetails.joinDate) || new Date(),
        paymentDueSince: new Date(stayDetails.joinDate) || new Date(),
      };
    } else if (rentType === "daily") {
      userData.stayDetails = {
        ...stayDetails,
        checkInDate: stayDetails.checkInDate
          ? new Date(stayDetails.checkInDate)
          : new Date(),
        checkOutDate: stayDetails.checkOutDate
          ? new Date(stayDetails.checkOutDate)
          : new Date(),
      };
      userData.financialDetails = {
        totalAmount: stayDetails.dailyRent * stayDetails.noOfDays,
        pendingAmount: stayDetails.dailyRent * stayDetails.noOfDays,
        accountBalance: 0,
      };
    }

    // 7. Save user
    const newUser = new User(userData);
    await newUser.save();

    await UserLog.create({
      userId: newUser._id,
      action: "create",
      changedByName: "resident",
      message: `New ${newUser.userType} (${newUser.name}) registered for ${
        newUser.stayDetails?.propertyName ||
        newUser.messDetails?.kitchenName ||
        "Unknown Property"
      } with ${rentType} rent type`,
      propertyId: newUser.stayDetails?.propertyId || null,
      kitchenId: newUser.stayDetails?.kitchenId || null,
      timestamp: new Date(),
    });

    // 8. Build response
    const responseData = {
      userId: newUser._id,
      name: newUser.name,
      email: newUser.email,
      userType: newUser.userType,
      rentType: newUser.rentType,
      ...(userType !== "messOnly"
        ? {
            residentId: newUser.residentId,
            roomNumber: newUser.stayDetails?.roomNumber,
          }
        : { kitchenName: newUser.messDetails?.kitchenName }),
    };

    return {
      statusCode: 201,
      body: {
        status: "success",
        message: "Registration successful. Awaiting approval.",
        data: responseData,
      },
    };
  } catch (err) {
    console.error("Registration Error:", err);

    let errorMessage = "Registration failed";
    let statusCode = 500;

    if (err.name === "ValidationError") {
      errorMessage = "Invalid user data";
      statusCode = 400;
    } else if (err.code === 11000) {
      errorMessage = "Duplicate key error";
      statusCode = 400;
      if (err.keyPattern?.email) errorMessage = "Email already registered";
      if (err.keyPattern?.contact)
        errorMessage = "Contact number already registered";
      if (err.keyPattern?.residentId)
        errorMessage = "Resident ID generation error";
    }

    return {
      statusCode,
      body: {
        status: "error",
        message: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      },
    };
  }
};
