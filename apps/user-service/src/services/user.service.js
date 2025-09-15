import mongoose from "mongoose";
import User from "../models/user.model.js";
import {
  checkExistingUsers,
  validateFieldFormats,
  validateRequiredFields,
} from "../utils/validators.js";
import { getNextResidentId } from "../utils/getNextResidentId.js";
import bcrypt from "bcrypt";
import UserLog from "../models/userLog.model.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";
import { assignRoomToUser } from "./internal.service.js";
import crypto from "crypto";
import { handleReferralOnApproval } from "../services/referral.service.js";
import emailService from "../services/email/email.service.js";
// import {
//   renderVerificationError,
//   renderVerificationServerError,
//   renderVerificationSuccess,
// } from "../services/email/verificationTemplate.service.js";

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

export const getUnapprovedUsers = async (data) => {
  try {
    console.log(data?.propertyId);
    const propertyId = data?.propertyId;
    // Base filter for all users
    const filter = {
      isApproved: false,
    };

    // If property filter is applied
    if (propertyId && propertyId !== "null") {
      // For MessOnly users, we'll need to check kitchen-property relationships
      // We'll use an $or condition to handle all user types
      filter.$or = [
        // Monthly/Daily residents - propertyId in stayDetails
        {
          userType: { $in: ["student", "worker", "dailyRent"] },
          "stayDetails.propertyId": propertyId,
        },
        // MessOnly users - kitchen must be accessible to this property
        {
          userType: "messOnly",
          "messDetails.kitchenId": { $exists: true },
          // Kitchen property check will be done after initial fetch
        },
      ];
    } else {
      // No property filter - get all unapproved residents
      filter.userType = { $exists: true };
    }

    // First fetch all matching users (except MessOnly property validation)
    // console.log(filter);
    let residents = await User.find(filter)
      .select(
        "name email contact userType stayDetails messDetails propertyId createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    // If property filter is active, we need to validate MessOnly users
    if (propertyId && propertyId !== "null") {
      // Get all kitchen IDs from MessOnly users
      const kitchenIds = residents
        .filter((u) => u.userType === "messOnly")
        .map((u) => u.messDetails?.kitchenId)
        .filter(Boolean);

      if (kitchenIds.length > 0) {
        // Call inventory-service to get kitchens accessible to this property
        const accessibleKitchens = await getAccessibleKitchens(propertyId);
        const accessibleKitchenIds = accessibleKitchens.map((k) =>
          k._id.toString()
        );

        // Filter MessOnly users - only keep those with kitchens accessible to the property
        residents = residents.filter((user) => {
          if (user.userType !== "messOnly") return true;
          return accessibleKitchenIds.includes(
            user.messDetails?.kitchenId?.toString()
          );
        });
      } else {
        // No MessOnly users with kitchens - remove all MessOnly users
        residents = residents.filter((user) => user.userType !== "messOnly");
      }
    }

    // Format the response data consistently
    const formattedResidents = residents.map((resident) => {
      const baseData = {
        _id: resident._id,
        name: resident.name,
        email: resident.email,
        contact: resident.contact,
        userType: resident.userType,
        createdAt: resident.createdAt,
      };

      if (resident.userType === "messOnly") {
        return {
          ...baseData,
          kitchenName: resident.messDetails?.kitchenName,
        };
      } else {
        return {
          ...baseData,
          roomNumber: resident.stayDetails?.roomNumber,
          propertyId: resident.stayDetails?.propertyId,
          propertyName: resident.stayDetails?.propertyName,
          sharingType: resident.stayDetails?.sharingType,
        };
      }
    });

    return {
      status: 200,
      body: {
        success: true,
        message: "Fetched unapproved residents successfully",
        data: formattedResidents,
      },
    };
  } catch (error) {
    console.error("Error fetching residents:", error);

    return {
      status: 500,
      body: {
        success: false,
        message: "Server error while fetching residents",
        error: error.message,
      },
    };
  }
};

export const approveUser = async (data) => {
  const {
    id,
    name,
    email,
    contact,
    userType,
    rentType,
    propertyId,
    propertyName,
    roomId,
    refundableDeposit,
    nonRefundableDeposit,
    joinDate,
    messDetails,
    stayDetails,
    monthlyRent,
    kitchenId,
    kitchenName,
    updatedBy,
  } = data;

  try {
    const user = await User.findById(id).lean();
    // console.log(user);

    if (!user) {
      return {
        status: 404,
        body: { error: "User not found" },
      };
    }

    if (user.isApproved) {
      return {
        status: 400,
        body: { error: "User already approved" },
      };
    }

    // Common updates for all user types
    const updates = {
      ...(name && { name }),
      ...(email && { email }),
      ...(contact && { contact }),
      ...(userType && { userType }),
      ...(rentType && { rentType }),
      isApproved: true,
      isLoginEnabled: true,
      updatedAt: new Date(),
      profileCompletion: calculateProfileCompletion(user),
    };

    // Type-specific updates
    if (user.userType === "messOnly") {
      if (!kitchenId) {
        return {
          status: 400,
          body: { error: "Kitchen ID is required for MessOnly users" },
        };
      }

      updates.messDetails = {
        ...user.messDetails,
        kitchenId: kitchenId || user.messDetails.kitchenId,
        kitchenName: kitchenName || user.messDetails?.kitchenName,
        mealType: messDetails.mealType || user.messDetails?.mealType,
        rent: messDetails.rent || user.messDetails?.rent,
        messStartDate:
          new Date(messDetails.messStartDate) ||
          new Date(user.messDetails?.messStartDate)() ||
          new Date(),
        messEndDate:
          new Date(messDetails.messEndDate) ||
          new Date(user.messDetails?.messEndDate) ||
          new Date(),
        noOfDays: messDetails.noOfDays || user.messDetails?.noOfDays,
      };

      updates.financialDetails = {
        totalAmount:
          (messDetails.rent || user.messDetails?.rent) *
          (messDetails.noOfDays || user.messDetails.noOfDays),
        pendingAmount:
          (messDetails.rent || user.messDetails?.rent) *
          (messDetails.noOfDays || user.messDetails.noOfDays),
        accountBalance: 0,
      };
    } else {
      // For Monthly and Daily residents - room assignment required
      if (!roomId) {
        return {
          status: 400,
          body: { error: "Room ID is required for approval" },
        };
      }

      const roomAssignment = await assignRoomToUser({
        userId: id,
        roomId,
        userType:
          user.rentType === "monthly" ? "longTermResident" : "dailyRenter",
      });

      if (user.rentType === "monthly") {
        updates.stayDetails = {
          ...user.stayDetails,
          monthlyRent: monthlyRent || user.stayDetails?.monthlyRent,
          refundableDeposit:
            refundableDeposit || user.stayDetails.refundableDeposit,
          nonRefundableDeposit:
            nonRefundableDeposit || user.stayDetails.nonRefundableDeposit,
          roomId,
          propertyId: propertyId || user.stayDetails?.propertyId,
          propertyName: propertyName || user.stayDetails?.propertyName,
          sharingType: roomAssignment.body.room.sharingType,
          roomNumber: roomAssignment.body.room.roomNo,
          joinDate: joinDate
            ? new Date(joinDate)
            : new Date(user.stayDetails?.joinDate) || new Date(),
        };

        updates.financialDetails = {
          monthlyRent: monthlyRent || user.stayDetails?.monthlyRent,
          pendingRent: monthlyRent || user.stayDetails?.monthlyRent,
          accountBalance: 0,
          nextDueDate: joinDate || user.stayDetails?.joinDate,
          paymentDueSince: joinDate || user.stayDetails?.joinDate,
        };
      } else if (user.rentType === "daily") {
        updates.stayDetails = {
          ...user.stayDetails,
          dailyRent: stayDetails.rent || user.stayDetails?.dailyRent,
          roomId,
          propertyId: propertyId || user.stayDetails?.propertyId,
          propertyName: propertyName || user.stayDetails?.propertyName,
          sharingType: roomAssignment.body.room.sharingType,
          roomNumber: roomAssignment.body.room.roomNo,
          checkInDate:
            new Date(stayDetails.checkInDate) ||
            new Date(user.stayDetails?.checkInDate)() ||
            new Date(),
          checkOutDate:
            new Date(stayDetails.checkOutDate) ||
            new Date(user.stayDetails?.checkOutDate)() ||
            new Date(),
          noOfDays: stayDetails.noOfDays || user.stayDetails?.noOfDays,
        };

        // const days =
        //   Math.ceil(
        //     (new Date(updates.stayDetails.checkOutDate) -
        //       new Date(updates.stayDetails.checkInDate)) /
        //       (1000 * 60 * 60 * 24)
        //   ) + 1;

        updates.financialDetails = {
          totalAmount:
            (stayDetails.rent || user.stayDetails?.dailyRent) *
            (stayDetails.noOfDays || user.stayDetails.noOfDays),
          pendingAmount:
            (stayDetails.rent || user.stayDetails?.dailyRent) *
            (stayDetails.noOfDays || user.stayDetails.noOfDays),
          accountBalance: 0,
        };
      }
    }

    // Generate verification token for all user types
    const verificationToken = crypto.randomBytes(32).toString("hex");
    updates.emailVerificationToken = verificationToken;
    updates.emailVerificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true }
    );

    try {
      await UserLog.create({
        userId: updatedUser._id,
        action: "create",
        changedByName: updatedBy, // or whoever approves
        message: `Approved ${updatedUser.userType} (${updatedUser.name}) for ${
          updatedUser.stayDetails?.propertyName ||
          updatedUser.messDetails?.kitchenName ||
          "Unknown Property"
        } with ${updatedUser.rentType} rent type`,
        propertyId: updatedUser.stayDetails?.propertyId || null,
        kitchenId:
          updatedUser.stayDetails?.kitchenId ||
          updatedUser.messDetails?.kitchenId ||
          null,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error("Failed to save approval log:", logError);
    }

    // Post-approval async tasks
    setImmediate(async () => {
      try {
        await Promise.all([
          user.userType !== "MessOnly" && handleReferralOnApproval(user),
          emailService.sendApprovalEmail(updatedUser, verificationToken),
        ]);
      } catch (err) {
        console.error("Post-approval async error:", err);
      }
    });

    return {
      status: 200,
      body: {
        success: true,
        message: "User approved successfully",
        data: {
          userId: updatedUser._id,
          name: updatedUser.name,
          userType: updatedUser.userType,
          rentType: updatedUser.rentType,
          ...(userType === "messOnly" && {
            kitchenName: updatedUser.messDetails?.kitchenName,
          }),
          ...(userType !== "messOnly" && {
            roomNumber: updatedUser.stayDetails?.roomNumber,
          }),
        },
      },
    };
  } catch (error) {
    console.error("Approval error:", error);
    return {
      status: error.status || 500,
      body: {
        success: false,
        error: error.message || "Server error during approval",
      },
    };
  }
};
