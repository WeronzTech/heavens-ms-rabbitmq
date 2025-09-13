import mongoose from "mongoose";
import User from "../models/user.model.js";
import { removeFromRoom } from "./property.service.js";

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
    console.log(data);
    let rentType;
    if (userType === "student" || userType === "worker") {
      rentType = "monthly";
    } else if (userType === "dailyRent") {
      rentType = "daily";
    } else if (userType === "messOnly") {
      rentType = "mess";
    }
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
      return res.status(400).json(validationError);
    }

    // 2. Validate field formats
    const formatErrors = validateFieldFormats(email, password, contact);
    if (formatErrors.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation errors",
        errors: formatErrors,
      });
    }

    // 3. Check for existing users (email/contact)
    const existingUserChecks = await checkExistingUsers(email, contact);
    if (existingUserChecks.error) {
      return res.status(400).json(existingUserChecks);
    }

    // 4. Generate necessary IDs and hash password
    const [residentId, hashedPassword] = await Promise.all([
      getNextResidentId(),
      bcrypt.hash(password, 10),
    ]);

    // 5. Prepare base user object
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

    // 6. Add type-specific data
    if (userType === "messOnly") {
      userData.messDetails = {
        ...messDetails,
        messStartDate: new Date(messDetails.messStartDate),
        messEndDate: new Date(messDetails.messEndDate),
      };

      // Calculate number of days for MessOnly
      //   const messDays =
      //     Math.ceil(
      //       (new Date(messDetails.messEndDate) -
      //         new Date(messDetails.messStartDate)) /
      //         (1000 * 60 * 60 * 24)
      //     ) + 1; // Include both start and end dates

      userData.financialDetails = {
        totalAmount: messDetails.rent * messDetails.noOfDays,
        pendingAmount: messDetails.rent * messDetails.noOfDays,
        accountBalance: 0,
      };
    } else if (rentType === "monthly") {
      // For Monthly Residents (Students/Workers)
      userData.residentId = residentId;
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
      // For Daily Renters
      userData.residentId = residentId;
      userData.stayDetails = {
        ...stayDetails,
        checkInDate: stayDetails.checkInDate
          ? new Date(stayDetails.checkInDate)
          : new Date(),
        checkOutDate: stayDetails.checkOutDate
          ? new Date(stayDetails.checkOutDate)
          : new Date(),
      };

      // Calculate number of days for DailyRent
      //   const dailyDays =
      //     stayDetails.noOfDays ||
      //     Math.ceil(
      //       (new Date(stayDetails.checkOutDate) -
      //         new Date(stayDetails.checkInDate)) /
      //         (1000 * 60 * 60 * 24)
      //     ) + 1; // Include both check-in and check-out dates

      userData.financialDetails = {
        totalAmount: stayDetails.dailyRent * stayDetails.noOfDays,
        pendingAmount: stayDetails.dailyRent * stayDetails.noOfDays,
        accountBalance: 0,
      };
    }

    // 7. Create and save user
    const newUser = new User(userData);
    await newUser.save();

    try {
      await UserLog.create({
        userId: newUser._id,
        action: "create",
        changedByName: "resident",
        message: `New ${newUser.userType} (${newUser.name}) registered for ${
          newUser.stayDetails.propertyName ||
          newUser.messDetails.kitchenName ||
          "UnKnown Property"
        } with ${rentType} rent type`,
        propertyId: newUser.stayDetails?.propertyId || null,
        kitchenId: newUser.stayDetails?.kitchenId || null,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error("Failed to save registration log:", logError);
    }

    // 8. Prepare response
    const responseData = {
      userId: newUser._id,
      name: newUser.name,
      email: newUser.email,
      userType: newUser.userType,
      rentType: newUser.rentType,
    };

    if (userType !== "messOnly") {
      responseData.residentId = newUser.residentId;
      responseData.roomNumber = newUser.stayDetails?.roomNumber;
    } else {
      responseData.kitchenName = newUser.messDetails?.kitchenName;
    }

    return res.status(201).json({
      status: "success",
      message: "Registration successful. Awaiting approval.",
      data: responseData,
    });
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
      if (err.keyPattern.email) {
        errorMessage = "Email already registered";
      } else if (err.keyPattern.contact) {
        errorMessage = "Contact number already registered";
      } else if (err.keyPattern.residentId) {
        errorMessage = "Resident ID generation error";
      }
    }

    return res.status(statusCode).json({
      status: "error",
      message: errorMessage,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
