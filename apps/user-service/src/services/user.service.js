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
import {
  assignRoomToUser,
  getAccessibleKitchens,
  removeFromRoom,
} from "./internal.service.js";
import crypto from "crypto";
import {
  cleanUpdateData,
  getCompletedFields,
  processAdminUpdates,
  rebuildNestedFields,
  updateUserFields,
  validateAdminUpdates,
  validateUserUpdate,
} from "../services/userUpdate.service.js";
import dayjs from "dayjs";
import {
  createServiceHistoryEntry,
  calculateEndDate,
  shouldArchiveCurrentStay,
} from "../utils/rejoinUser.utils.js";
import emailService from "../../../../libs/email/email.service.js";
import {
  renderVerificationError,
  renderVerificationServerError,
  renderVerificationSuccess,
} from "../../../../libs/email/renderTemplate.service.js";
import {
  deleteFromFirebase,
  uploadToFirebase,
} from "../../../../libs/common/imageOperation.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { SOCKET_PATTERN } from "../../../../libs/patterns/socket/socket.pattern.js";

export const fetchUserData = async (data) => {
  try {
    const { roomId } = data;

    if (!roomId) {
      return {
        status: 400,
        body: { error: "roomId is required" },
      };
    }

    // Find users who are occupying the given roomId
    const occupants = await User.find({ "stayDetails.roomId": roomId }).select(
      "name paymentStatus contact userType stayDetails"
    );

    if (!occupants || occupants.length === 0) {
      return {
        status: 404,
        body: { error: "No users found for this room" },
      };
    }

    return {
      status: 200,
      body: occupants,
    };
  } catch (error) {
    console.error("Error fetching room occupants:", error);
    return {
      status: 500,
      body: { error: "Internal server error" },
    };
  }
};

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
      await removeFromRoom({ userId: user._id, roomId: currentRoomId });
    }

    user.isVacated = true;
    user.vacatedAt = new Date();
    user.currentStatus = "checked_out";
    user.stayDetails.roomId = null;
    user.isLoginEnabled = false;
    await user.save({ session });

    // console.log(user);

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
      isHeavens,
      isApproved,
      personalDetails,
      referredByCode,
      agent,
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
      contact,
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
      password ? bcrypt.hash(password, 10) : Promise.resolve(null),
    ]);

    const isColiving = stayDetails?.sharingType === "Coliving";

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
      isApproved: isApproved || false,
      isHeavens: isHeavens || false,
      isColiving,
      personalDetails,
      referralInfo: { referredByCode: referredByCode || null },
      agent,
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
    if (userType === "messOnly") {
      await assignRoomToUser({
        userId: newUser._id,
        roomId: stayDetails.roomId,
        userType: "dailyRenter",
      });
    }
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
        const accessibleKitchens = await getAccessibleKitchens({ propertyId });
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
  console.log(data);
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

      const refundable = Number(
        refundableDeposit ?? user.stayDetails?.refundableDeposit ?? 0
      );
      const nonRefundable = Number(
        nonRefundableDeposit ?? user.stayDetails?.nonRefundableDeposit ?? 0
      );

      const depositStatus =
        refundable === 0 && nonRefundable === 0
          ? null
          : user.stayDetails?.depositStatus ?? "pending";

      if (user.rentType === "monthly") {
        updates.stayDetails = {
          ...user.stayDetails,
          monthlyRent: monthlyRent || user.stayDetails?.monthlyRent,
          refundableDeposit: refundable,
          nonRefundableDeposit: nonRefundable,
          depositStatus,
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
          user.userType !== "MessOnly",
          emailService.sendApprovalEmail(updatedUser, verificationToken),
        ]);
      } catch (err) {
        console.error("Post-approval async error:", err);
      }
    });

    const userIdsToNotify = ["688722e075ee06d71c8fdb02"];

    userIdsToNotify.push(updatedUser._id);

    const socket = await sendRPCRequest(SOCKET_PATTERN.EMIT, {
      userIds: userIdsToNotify,
      event: "approval-status",
      data: updatedUser,
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

export const rejectUser = async (data) => {
  try {
    const { id, updatedBy } = data;

    if (!id) {
      return {
        status: 400,
        body: {
          success: false,
          message: "User ID is required",
        },
      };
    }

    // Find the user before deleting (to log details)
    const userToDelete = await User.findById(id).lean();

    if (!userToDelete) {
      return {
        status: 404,
        body: {
          success: false,
          message: "User not found or already removed",
        },
      };
    }

    // Delete the user
    await User.findByIdAndDelete(id);

    // ===== CREATE LOG =====
    try {
      await UserLog.create({
        userId: userToDelete._id,
        action: "delete",
        changedByName: updatedBy, // or actual approver's name from req.user
        message: `Rejected ${userToDelete.userType} (${
          userToDelete.name
        }) for ${
          userToDelete.stayDetails?.propertyName ||
          userToDelete.messDetails?.kitchenName ||
          "Unknown Property"
        } with ${userToDelete.rentType} rent type`,
        propertyId: userToDelete.stayDetails?.propertyId || null,
        kitchenId:
          userToDelete.stayDetails?.kitchenId ||
          userToDelete.messDetails?.kitchenId ||
          null,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error("Failed to save rejection log:", logError);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "User onboarding request rejected successfully",
      },
    };
  } catch (err) {
    console.error("Reject User Error:", err);
    return {
      status: 500,
      body: {
        success: false,
        message: "Failed to reject user request",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      },
    };
  }
};

export const verifyEmail = async (data) => {
  const { token, email } = data;

  try {
    const user = await User.findOne({
      email,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      const html = await renderVerificationError(
        "Invalid token or token expired"
      );
      return {
        status: 400,
        body: html,
        isHtml: true,
      };
    }

    // Mark email as verified and enable login
    user.isVerified = true;
    user.isLoginEnabled = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const html = await renderVerificationSuccess();
    return {
      status: 200,
      body: html,
      isHtml: true,
    };
  } catch (error) {
    console.error("Verification error:", error);
    const html = await renderVerificationServerError();
    return {
      status: 500,
      body: html,
      isHtml: true,
    };
  }
};

export const updateProfileCompletion = async (data) => {
  const { id, updateData, files } = data;

  let photoUrl = null;
  let aadharFrontUrl = null;
  let aadharBackUrl = null;

  // 🧩 NEW: coliving partner Aadhar URLs
  let partnerAadharFrontUrl = null;
  let partnerAadharBackUrl = null;

  if (files) {
    // 🖼️ Upload user's profile photo
    if (files.profileImg?.[0]) {
      console.log("Uploading profile photo...");
      photoUrl = await uploadToFirebase(files.profileImg[0], "user-photos");
      console.log("Profile photo uploaded to:", photoUrl);
    }

    // 🪪 Upload user's Aadhar (front & back)
    if (files.aadharFront?.[0]) {
      console.log("Uploading Aadhar front image...");
      aadharFrontUrl = await uploadToFirebase(
        files.aadharFront[0],
        "user-documents"
      );
      console.log("Aadhar front uploaded:", aadharFrontUrl);
    }

    if (files.aadharBack?.[0]) {
      console.log("Uploading Aadhar back image...");
      aadharBackUrl = await uploadToFirebase(
        files.aadharBack[0],
        "user-documents"
      );
      console.log("Aadhar back uploaded:", aadharBackUrl);
    }

    // 🧩 NEW: Upload coliving partner's Aadhar (front & back)
    if (files.partnerAadharFront?.[0]) {
      console.log("Uploading coliving partner Aadhar front...");
      partnerAadharFrontUrl = await uploadToFirebase(
        files.partnerAadharFront[0],
        "user-documents"
      );
      console.log("Partner Aadhar front uploaded:", partnerAadharFrontUrl);
    }

    if (files.partnerAadharBack?.[0]) {
      console.log("Uploading coliving partner Aadhar back...");
      partnerAadharBackUrl = await uploadToFirebase(
        files.partnerAadharBack[0],
        "user-documents"
      );
      console.log("Partner Aadhar back uploaded:", partnerAadharBackUrl);
    }
  }

  // 🧩 Ensure nested objects exist
  updateData.personalDetails = updateData.personalDetails || {};
  if (updateData.colivingPartner)
    updateData.colivingPartner.personalDetails =
      updateData.colivingPartner.personalDetails || {};

  // 🧩 Assign uploaded URLs
  if (photoUrl) updateData.personalDetails.profileImg = photoUrl;
  if (aadharFrontUrl) updateData.personalDetails.aadharFront = aadharFrontUrl;
  if (aadharBackUrl) updateData.personalDetails.aadharBack = aadharBackUrl;

  // 🧩 Assign partner’s Aadhar URLs if provided
  if (partnerAadharFrontUrl)
    updateData.colivingPartner.personalDetails.aadharFront =
      partnerAadharFrontUrl;
  if (partnerAadharBackUrl)
    updateData.colivingPartner.personalDetails.aadharBack =
      partnerAadharBackUrl;

  try {
    const user = await User.findById(id);
    if (!user) {
      return {
        status: 404,
        body: { success: false, error: "User not found" },
      };
    }

    await validateUserUpdate(user, updateData);
    updateUserFields(user, updateData);
    await user.save();

    return {
      status: 200,
      body: {
        success: true,
        message:
          user.profileCompletion === 100
            ? "Profile fully completed. You are at 100%."
            : `Profile updated successfully. ${
                100 - user.profileCompletion
              }% remaining.`,
        profileCompletion: user.profileCompletion,
        userType: user.userType,
        completedFields: getCompletedFields(user),
      },
    };
  } catch (error) {
    console.error("Profile update error:", error);

    const msg = error.message.toLowerCase();
    const isValidationError =
      msg.includes("invalid") ||
      msg.includes("missing") ||
      msg.includes("already") ||
      msg.includes("must") ||
      msg.includes("cannot") ||
      msg.includes("required");

    const status = isValidationError ? 400 : 500;

    return {
      status,
      body: {
        success: false,
        error: isValidationError
          ? error.message
          : "Server error during profile update",
      },
    };
  }
};

export const adminUpdateUser = async (data) => {
  const { id, files, flat } = data;
  console.log(data);
  const updateData = await rebuildNestedFields(flat);
  console.log(updateData);

  try {
    const user = await User.findById(id);
    if (!user) {
      return {
        status: 404,
        body: { success: false, error: "User not found" },
      };
    }

    const personal = updateData.personalDetails || {};
    const coLiving = updateData.colivingPartner || {};

    const originalProfileImg = user.personalDetails?.profileImg;
    const originalAadharFront = user.personalDetails?.aadharFront;
    const originalAadharBack = user.personalDetails?.aadharBack;

    const originalProfileImgPartner = user.colivingPartner?.profileImg;
    const originalAadharFrontPartner = user.colivingPartner?.aadharFront;
    const originalAadharBackPartner = user.colivingPartner?.aadharBack;

    // ===== PROFILE IMAGE =====
    const shouldDeleteProfile =
      updateData.deleteProfileImg === "true" ||
      updateData.deleteProfileImg === true;

    if (shouldDeleteProfile || files?.profileImg?.[0]) {
      if (originalProfileImg) {
        await deleteFromFirebase(originalProfileImg); // Always delete the old one
      }
    }

    if (files?.profileImg?.[0]) {
      personal.profileImg = await uploadToFirebase(
        files.profileImg[0],
        "user-photos"
      );
    } else if (shouldDeleteProfile) {
      personal.profileImg = null;
    }

    // ===== AADHAR FRONT =====
    const shouldDeleteFront =
      updateData.deleteAadharFront === "true" ||
      updateData.deleteAadharFront === true;

    if (shouldDeleteFront || files?.aadharFront?.[0]) {
      if (originalAadharFront) {
        await deleteFromFirebase(originalAadharFront);
      }
    }

    if (files?.aadharFront?.[0]) {
      personal.aadharFront = await uploadToFirebase(
        files.aadharFront[0],
        "user-documents"
      );
    } else if (shouldDeleteFront) {
      personal.aadharFront = null;
    }

    // ===== AADHAR BACK =====
    const shouldDeleteBack =
      updateData.deleteAadharBack === "true" ||
      updateData.deleteAadharBack === true;

    if (shouldDeleteBack || files?.aadharBack?.[0]) {
      if (originalAadharBack) {
        await deleteFromFirebase(originalAadharBack);
      }
    }

    if (files?.aadharBack?.[0]) {
      personal.aadharBack = await uploadToFirebase(
        files.aadharBack[0],
        "user-documents"
      );
    } else if (shouldDeleteBack) {
      personal.aadharBack = null;
    }

    // ===== PARTNER PROFILE IMAGE =====
    const shouldDeletePartnerProfile =
      updateData.deletePartnerProfileImg === "true" ||
      updateData.deletePartnerProfileImg === true;

    if (shouldDeletePartnerProfile || files?.partnerProfileImg?.[0]) {
      if (originalProfileImgPartner) {
        await deleteFromFirebase(originalProfileImgPartner);
      }
    }

    if (files?.partnerProfileImg?.[0]) {
      coLiving.profileImg = await uploadToFirebase(
        files.partnerProfileImg[0],
        "user-photos"
      );
    } else if (shouldDeletePartnerProfile) {
      coLiving.profileImg = null;
    }

    // ===== PARTNER AADHAR FRONT =====
    const shouldDeletePartnerFront =
      updateData.deletePartnerAadharFront === "true" ||
      updateData.deletePartnerAadharFront === true;

    if (shouldDeletePartnerFront || files?.partnerAadharFront?.[0]) {
      if (originalAadharFrontPartner) {
        await deleteFromFirebase(originalAadharFrontPartner);
      }
    }

    if (files?.partnerAadharFront?.[0]) {
      coLiving.aadharFront = await uploadToFirebase(
        files.partnerAadharFront[0],
        "user-documents"
      );
    } else if (shouldDeletePartnerFront) {
      coLiving.aadharFront = null;
    }

    // ===== PARTNER AADHAR BACK =====
    const shouldDeletePartnerBack =
      updateData.deletePartnerAadharBack === "true" ||
      updateData.deletePartnerAadharBack === true;

    if (shouldDeletePartnerBack || files?.partnerAadharBack?.[0]) {
      if (originalAadharBackPartner) {
        await deleteFromFirebase(originalAadharBackPartner);
      }
    }

    if (files?.partnerAadharBack?.[0]) {
      coLiving.aadharBack = await uploadToFirebase(
        files.partnerAadharBack[0],
        "user-documents"
      );
    } else if (shouldDeletePartnerBack) {
      coLiving.aadharBack = null;
    }

    // ✅ Update the user object with new personal details
    updateData.personalDetails = personal;
    updateData.colivingPartner = coLiving;

    // ✨ Clean and validate remaining non-file fields
    const cleanedData = cleanUpdateData(updateData);
    await validateAdminUpdates(user, cleanedData);

    // ✨ Update other fields (e.g., room, property, etc.)
    await processAdminUpdates(user, updateData);

    // ✅ Save user
    await user.save();

    try {
      await UserLog.create({
        userId: user._id,
        action: "update",
        changedByName: updateData.adminName || "Unknown Admin",
        message: `${updateData.adminName || "Unknown"} updated ${
          user.userType
        } (${user.name}) details for ${
          user.stayDetails?.propertyName ||
          user.messDetails?.kitchenName ||
          "Unknown Property"
        }`,
        propertyId: user.stayDetails?.propertyId || null,
        kitchenId: user.messDetails?.kitchenId || null,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error("Failed to save admin update log:", logError);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "User data updated successfully",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          rentType: user.rentType,
          profileCompletion: user.profileCompletion,
          ...(user.userType !== "messOnly" && {
            roomNumber: user.stayDetails?.roomNumber,
            propertyId: user.stayDetails?.propertyId,
            propertyName: user.stayDetails?.propertyName,
          }),
          ...(user.userType === "messOnly" && {
            kitchenName: user.messDetails?.kitchenName,
          }),
        },
      },
    };
  } catch (error) {
    console.error("Admin user update error:", error);
    const status =
      error.status ||
      error.message.includes("already") ||
      error.message.includes("cannot") ||
      error.message.includes("Invalid")
        ? 400
        : 500;

    return {
      status,
      body: {
        success: false,
        error:
          status === 400 ? error.message : "Server error during user update",
      },
    };
  }
};

export const getHeavensUserById = async (data) => {
  const { userId } = data;

  try {
    const user = await User.findById(userId).lean();
    // console.log(user);
    if (!user) {
      return {
        status: 404,
        body: { success: false, message: "User not found" },
      };
    }

    const nextDueDateRaw = user.financialDetails?.nextDueDate;
    const today = dayjs();

    let rentReminder = null;

    if (nextDueDateRaw) {
      const dueDate = dayjs(nextDueDateRaw);
      const daysLeft = dueDate.diff(today, "day");

      if (daysLeft <= 5 && daysLeft > 0) {
        rentReminder = {
          daysLeft,
          message: `Your rent is due in ${daysLeft} day${
            daysLeft === 1 ? "" : "s"
          } on ${dueDate.format("DD-MM-YYYY")}`,
        };
      } else if (daysLeft === 0) {
        rentReminder = {
          daysLeft: 0,
          message: `Your rent is due today (${dueDate.format("DD-MM-YYYY")})`,
        };
      } else if (daysLeft < 0) {
        const overdueDays = Math.abs(daysLeft);
        rentReminder = {
          daysLeft: 0,
          message: `Your rent is overdue by ${overdueDays} day${
            overdueDays === 1 ? "" : "s"
          } (was due on ${dueDate.format("DD-MM-YYYY")})`,
        };
      }
    }

    user.rentReminder = rentReminder;

    return {
      status: 200,
      body: { success: true, data: { ...user, rentReminder } },
    };
  } catch (error) {
    console.error("getHeavensUserById error:", error);
    return {
      status: 500,
      body: { success: false, message: "Server error" },
    };
  }
};

export const getUsersByRentType = async (data) => {
  try {
    const { rentType, propertyId, all, page, limit, search, status, joinDate } =
      data;

    // New flag to determine whether to fetch all users (no pagination)
    const fetchAll = all === true || all === "true";

    // Convert and validate pagination parameters
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Validate pagination only if not fetching all
    if (!fetchAll) {
      if (
        isNaN(pageNumber) ||
        pageNumber < 1 ||
        isNaN(limitNumber) ||
        limitNumber < 1 ||
        limitNumber > 100
      ) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Invalid pagination parameters",
          },
        };
      }
    }

    // Base query conditions
    const queryConditions = {
      isApproved: true,
      isVacated: false,
    };

    // Rent Type filter
    if (rentType) {
      if (rentType === "mess") {
        queryConditions.userType = "messOnly";
      } else {
        queryConditions.rentType = rentType;
        queryConditions.userType = { $in: ["student", "worker", "dailyRent"] };
      }
    }

    // Property filter
    if (propertyId && propertyId !== "null") {
      if (rentType === "mess") {
        const accessibleKitchensResponse = await getAccessibleKitchens({
          propertyId,
        });

        if (
          accessibleKitchensResponse.success &&
          accessibleKitchensResponse.data
        ) {
          const kitchenIds = accessibleKitchensResponse.data.map((k) =>
            k._id.toString()
          );
          queryConditions["messDetails.kitchenId"] = { $in: kitchenIds };
        } else {
          console.error(
            "Failed to fetch accessible kitchens:",
            accessibleKitchensResponse.message
          );
          queryConditions["messDetails.kitchenId"] = { $in: [] };
        }
      } else {
        queryConditions["stayDetails.propertyId"] = new mongoose.Types.ObjectId(
          propertyId
        );
      }
    }

    // Search functionality
    if (search) {
      const searchRegex = new RegExp(search, "i");
      queryConditions.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contact: searchRegex },
        { "stayDetails.roomNumber": searchRegex },
        { "stayDetails.propertyName": searchRegex },
      ];
    }

    // Status filter
    if (status && status !== "All") {
      const statusMapping = {
        Paid: "paid",
        Pending: "pending",
        "On Leave": "on_leave",
        "Checked Out": "checked_out",
        "Incomplete Profile": "incomplete",
      };

      if (status === "Paid" || status === "Pending") {
        queryConditions.paymentStatus = statusMapping[status];
      } else if (status === "On Leave" || status === "Checked Out") {
        queryConditions.currentStatus = statusMapping[status];
      } else if (status === "Incomplete Profile") {
        queryConditions.profileCompletion = { $ne: 100 };
      }
    }

    // Date filter
    if (joinDate) {
      try {
        const startDate = new Date(`${joinDate}T00:00:00.000Z`);
        const endDate = new Date(`${joinDate}T23:59:59.999Z`);

        queryConditions.$or = [
          { createdAt: { $gte: startDate, $lte: endDate } },
          { "stayDetails.joinDate": { $gte: startDate, $lte: endDate } },
        ];
      } catch (err) {
        console.error("Error parsing joinDate:", joinDate, err);
      }
    }

    // Projection
    const projection = {
      name: 1,
      email: 1,
      contact: 1,
      userType: 1,
      rentType: 1,
      profileCompletion: 1,
      currentStatus: 1,
      paymentStatus: 1,
      isBlocked: 1,
      "messDetails.kitchenName": 1,
      "messDetails.mealType": 1,
      "messDetails.messStartDate": 1,
      "messDetails.messEndDate": 1,
      "messDetails.rent": 1,
      "messDetails.noOfDays": 1,
      "financialDetails.totalAmount": 1,
      "financialDetails.pendingAmount": 1,
      "financialDetails.fines": 1,
      "stayDetails.nonRefundableDeposit": 1,
      "stayDetails.refundableDeposit": 1,
      "stayDetails.depositStatus": 1,
      "stayDetails.depositAmountPaid": 1,
      "stayDetails.roomNumber": 1,
      "stayDetails.propertyName": 1,
      "stayDetails.joinDate": 1,
      "stayDetails.checkInDate": 1,
      "stayDetails.checkOutDate": 1,
      "stayDetails.extendDate": 1,
      "stayDetails.noOfDays": 1,
      "stayDetails.sharingType": 1,
      "stayDetails.dailyRent": 1,
      "financialDetails.monthlyRent": 1,
      "financialDetails.pendingRent": 1,
      "financialDetails.nextDueDate": 1,
      createdAt: 1,
    };

    if (rentType !== "daily" && rentType !== "mess") {
      projection["stayDetails.nonRefundableDeposit"] = 1;
      projection["stayDetails.refundableDeposit"] = 1;
      projection["stayDetails.depositStatus"] = 1;
      projection["stayDetails.depositAmountPaid"] = 1;
    }

    // Total count for pagination
    const totalCount = await User.countDocuments(queryConditions);
    const totalPages = Math.ceil(totalCount / limitNumber);
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch users (skip pagination if fetchAll)
    let query = User.find(queryConditions)
      .select(projection)
      .sort({ createdAt: -1 });

    if (!fetchAll) {
      query = query.skip(skip).limit(limitNumber);
    }

    const users = await query.lean();

    // Format users
    const formattedUsers = users.map((user) => {
      const fines = user.financialDetails?.fines || [];
      const outstandingFines = fines
        .filter((fine) => !fine.paid)
        .reduce((sum, fine) => sum + (fine.amount || 0), 0);

      const formatted = {
        _id: user._id,
        name: user.name,
        email: user.email,
        contact: user.contact,
        userType: user.userType,
        rentType: user.rentType,
        isBlocked: user.isBlocked,
        profileCompletion: user.profileCompletion,
        currentStatus: user.currentStatus,
        paymentStatus: user.paymentStatus,
        kitchenName: user.messDetails?.kitchenName,
        mealType: user.messDetails?.mealType,
        noOfDaysMess: user.messDetails?.noOfDays,
        totalAmount: user.financialDetails?.totalAmount,
        pendingAmount: user.financialDetails?.pendingAmount,
        roomNumber: user.stayDetails?.roomNumber,
        propertyName: user.stayDetails?.propertyName,
        sharingType: user.stayDetails?.sharingType,
        rent: user.stayDetails?.dailyRent || user.messDetails?.rent,
        monthlyRent: user.financialDetails?.monthlyRent,
        pendingRent: user.financialDetails?.pendingRent,
        nextDueDate: user.financialDetails?.nextDueDate,
        fines,
        outstandingFines,
        joinedDate: user.stayDetails?.joinDate,
        checkInDate: user.stayDetails?.checkInDate,
        checkOutDate: user.stayDetails?.checkOutDate,
        extendDate: user.stayDetails?.extendDate,
        noOfDays: user.stayDetails?.noOfDays,
        messStartDate: user.messDetails?.messStartDate,
        messEndDate: user.messDetails?.messEndDate,
        noOfDaysForMessOnly: user.messDetails?.noOfDays,
      };

      if (rentType !== "daily" && rentType !== "mess") {
        formatted.depositAmount =
          (user.stayDetails?.nonRefundableDeposit || 0) +
          (user.stayDetails?.refundableDeposit || 0);
        formatted.depositPaid = user.stayDetails?.depositAmountPaid;
        formatted.depositStatus = user.stayDetails?.depositStatus;
      }

      return formatted;
    });

    // --- Aggregates using $facet ---
    const aggregates = await User.aggregate([
      { $match: queryConditions },
      {
        $facet: {
          totalResidents: [{ $count: "count" }],
          totalPaid: [
            { $match: { paymentStatus: "paid" } },
            { $count: "count" },
          ],
          totalPending: [
            { $match: { paymentStatus: "pending" } },
            { $count: "count" },
          ],
          totalCheckedIn: [
            { $match: { currentStatus: "checked_in" } },
            { $count: "count" },
          ],
          totalOnLeave: [
            { $match: { currentStatus: "on_leave" } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const summary = {
      totalResidents: aggregates[0].totalResidents[0]?.count || 0,
      totalPaid: aggregates[0].totalPaid[0]?.count || 0,
      totalPending: aggregates[0].totalPending[0]?.count || 0,
      totalCheckedIn: aggregates[0].totalCheckedIn[0]?.count || 0,
      totalOnLeave: aggregates[0].totalOnLeave[0]?.count || 0,
    };

    // Return consistent response
    return {
      status: 200,
      body: {
        success: true,
        summary, // <-- new summary field
        pagination: {
          total: totalCount,
          totalPages: fetchAll ? 1 : totalPages,
          currentPage: fetchAll ? 1 : pageNumber,
          itemsPerPage: fetchAll ? totalCount : limitNumber,
          hasNextPage: !fetchAll && pageNumber < totalPages,
          hasPreviousPage: !fetchAll && pageNumber > 1,
        },
        data: formattedUsers,
      },
    };
  } catch (error) {
    console.error("Error fetching users by rentType:", error);
    return {
      status: 500,
      body: {
        success: false,
        error: "Server error while fetching users",
      },
    };
  }
};

// export const getUsersByRentType = async (data) => {
//   try {
//     const { rentType, propertyId, all, page, limit, search, status, joinDate } =
//       data;

//     // New flag to determine whether to fetch all users (no pagination)
//     const fetchAll = all === true || all === "true";

//     // Convert and validate pagination parameters
//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);

//     // Validate pagination only if not fetching all
//     if (!fetchAll) {
//       if (
//         isNaN(pageNumber) ||
//         pageNumber < 1 ||
//         isNaN(limitNumber) ||
//         limitNumber < 1 ||
//         limitNumber > 100
//       ) {
//         return {
//           status: 400,
//           body: {
//             success: false,
//             error: "Invalid pagination parameters",
//           },
//         };
//       }
//     }

//     // Base query conditions
//     const queryConditions = {
//       isApproved: true,
//       isVacated: false,
//     };

//     // Rent Type filter
//     if (rentType) {
//       if (rentType === "mess") {
//         queryConditions.userType = "messOnly";
//       } else {
//         queryConditions.rentType = rentType;
//         queryConditions.userType = { $in: ["student", "worker", "dailyRent"] };
//       }
//     }

//     // Property filter
//     if (propertyId && propertyId !== "null") {
//       if (rentType === "mess") {
//         const accessibleKitchensResponse = await getAccessibleKitchens({
//           propertyId,
//         });

//         // Check if the request was successful and data exists
//         if (
//           accessibleKitchensResponse.success &&
//           accessibleKitchensResponse.data
//         ) {
//           const kitchenIds = accessibleKitchensResponse.data.map((k) =>
//             k._id.toString()
//           );
//           queryConditions["messDetails.kitchenId"] = { $in: kitchenIds };
//         } else {
//           console.error(
//             "Failed to fetch accessible kitchens:",
//             accessibleKitchensResponse.message
//           );
//           queryConditions["messDetails.kitchenId"] = { $in: [] };
//         }
//       } else {
//         queryConditions["stayDetails.propertyId"] = propertyId;
//       }
//     }

//     // Search functionality - enhanced
//     if (search) {
//       const searchRegex = new RegExp(search, "i"); // Case-insensitive
//       queryConditions.$or = [
//         { name: searchRegex },
//         { email: searchRegex },
//         { contact: searchRegex },
//         { "stayDetails.roomNumber": searchRegex },
//         { "stayDetails.propertyName": searchRegex },
//       ];
//     }

//     // Status filter - fixed mapping
//     if (status && status !== "All") {
//       const statusMapping = {
//         Paid: "paid",
//         Pending: "pending",
//         "On Leave": "on_leave",
//         "Checked Out": "checked_out",
//         "Incomplete Profile": "incomplete",
//       };

//       if (status === "Paid" || status === "Pending") {
//         queryConditions.paymentStatus = statusMapping[status];
//       } else if (status === "On Leave" || status === "Checked Out") {
//         queryConditions.currentStatus = statusMapping[status];
//       } else if (status === "Incomplete Profile") {
//         queryConditions.profileCompletion = { $ne: 100 };
//       }
//     }

//     // Date filter - robust handling
//     if (joinDate) {
//       try {
//         const startDate = new Date(`${joinDate}T00:00:00.000Z`);
//         const endDate = new Date(`${joinDate}T23:59:59.999Z`);

//         queryConditions.$or = [
//           { createdAt: { $gte: startDate, $lte: endDate } },
//           { "stayDetails.joinDate": { $gte: startDate, $lte: endDate } },
//         ];
//       } catch (err) {
//         console.error("Error parsing joinDate:", joinDate, err);
//       }
//     }

//     // Projection to reduce data transfer
//     const projection = {
//       name: 1,
//       email: 1,
//       contact: 1,
//       userType: 1,
//       rentType: 1,
//       profileCompletion: 1,
//       currentStatus: 1,
//       paymentStatus: 1,
//       isBlocked: 1,
//       "messDetails.kitchenName": 1,
//       "messDetails.mealType": 1,
//       "messDetails.messStartDate": 1,
//       "messDetails.messEndDate": 1,
//       "messDetails.rent": 1,
//       "messDetails.noOfDays": 1,
//       "financialDetails.totalAmount": 1,
//       "financialDetails.pendingAmount": 1,
//       "financialDetails.fines": 1,
//       "stayDetails.nonRefundableDeposit": 1,
//       "stayDetails.refundableDeposit": 1,
//       "stayDetails.depositStatus": 1,
//       "stayDetails.depositAmountPaid": 1,
//       "stayDetails.roomNumber": 1,
//       "stayDetails.propertyName": 1,
//       "stayDetails.joinDate": 1,
//       "stayDetails.checkInDate": 1,
//       "stayDetails.checkOutDate": 1,
//       "stayDetails.noOfDays": 1,
//       "stayDetails.sharingType": 1,
//       "stayDetails.dailyRent": 1,
//       "financialDetails.monthlyRent": 1,
//       "financialDetails.pendingRent": 1,
//       "financialDetails.nextDueDate": 1,
//       createdAt: 1,
//     };

//     if (rentType !== "daily" && rentType !== "mess") {
//       projection["stayDetails.nonRefundableDeposit"] = 1;
//       projection["stayDetails.refundableDeposit"] = 1;
//       projection["stayDetails.depositStatus"] = 1;
//       projection["stayDetails.depositAmountPaid"] = 1;
//     }

//     // Get total count for pagination metadata
//     const totalCount = await User.countDocuments(queryConditions);
//     const totalPages = Math.ceil(totalCount / limitNumber);
//     const skip = (pageNumber - 1) * limitNumber;

//     // Fetch users (skip pagination if fetchAll)
//     let query = User.find(queryConditions)
//       .select(projection)
//       .sort({ createdAt: -1 });

//     if (!fetchAll) {
//       query = query.skip(skip).limit(limitNumber);
//     }

//     const users = await query.lean();

//     // Format response
//     const formattedUsers = users.map((user) => {
//       const fines = user.financialDetails?.fines || [];
//       const outstandingFines = fines
//         .filter((fine) => !fine.paid)
//         .reduce((sum, fine) => sum + (fine.amount || 0), 0);

//       const formatted = {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         contact: user.contact,
//         userType: user.userType,
//         rentType: user.rentType,
//         isBlocked: user.isBlocked,
//         profileCompletion: user.profileCompletion,
//         currentStatus: user.currentStatus,
//         paymentStatus: user.paymentStatus,
//         kitchenName: user.messDetails?.kitchenName,
//         mealType: user.messDetails?.mealType,
//         noOfDaysMess: user.messDetails?.noOfDays,
//         totalAmount: user.financialDetails?.totalAmount,
//         pendingAmount: user.financialDetails?.pendingAmount,
//         roomNumber: user.stayDetails?.roomNumber,
//         propertyName: user.stayDetails?.propertyName,
//         sharingType: user.stayDetails?.sharingType,
//         rent: user.stayDetails?.dailyRent || user.messDetails?.rent,
//         monthlyRent: user.financialDetails?.monthlyRent,
//         pendingRent: user.financialDetails?.pendingRent,
//         nextDueDate: user.financialDetails?.nextDueDate,
//         fines,
//         outstandingFines,
//         joinedDate: user.stayDetails?.joinDate,
//         checkInDate: user.stayDetails?.checkInDate,
//         checkOutDate: user.stayDetails?.checkOutDate,
//         noOfDays: user.stayDetails?.noOfDays,
//         messStartDate: user.messDetails?.messStartDate,
//         messEndDate: user.messDetails?.messEndDate,
//         noOfDaysForMessOnly: user.messDetails?.noOfDays,
//       };

//       if (rentType !== "daily" && rentType !== "mess") {
//         formatted.depositAmount =
//           (user.stayDetails?.nonRefundableDeposit || 0) +
//           (user.stayDetails?.refundableDeposit || 0);
//         formatted.depositPaid = user.stayDetails?.depositAmountPaid;
//         formatted.depositStatus = user.stayDetails?.depositStatus;
//       }

//       return formatted;
//     });

//     // Return consistent response
//     return {
//       status: 200,
//       body: {
//         success: true,
//         pagination: {
//           total: totalCount,
//           totalPages: fetchAll ? 1 : totalPages,
//           currentPage: fetchAll ? 1 : pageNumber,
//           itemsPerPage: fetchAll ? totalCount : limitNumber,
//           hasNextPage: !fetchAll && pageNumber < totalPages,
//           hasPreviousPage: !fetchAll && pageNumber > 1,
//         },
//         data: formattedUsers,
//       },
//     };
//   } catch (error) {
//     console.error("Error fetching users by rentType:", error);
//     return {
//       status: 500,
//       body: {
//         success: false,
//         error: "Server error while fetching users",
//       },
//     };
//   }
// };

export const getCheckOutedUsersByRentType = async (data) => {
  try {
    const { rentType, propertyId, page, limit, search } = data;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Validate rentType (if provided)
    const validRentTypes = ["monthly", "daily", "mess"];
    if (rentType && !validRentTypes.includes(rentType)) {
      return {
        status: 400,
        body: {
          success: false,
          error: "Invalid rentType. Must be monthly, daily, or mess",
        },
      };
    }

    // Validate pagination parameters
    if (isNaN(pageNumber) || pageNumber < 1) {
      return {
        status: 400,
        body: {
          success: false,
          error: "Invalid page number. Must be a positive integer",
        },
      };
    }

    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return {
        status: 400,
        body: {
          success: false,
          error: "Invalid limit. Must be between 1 and 100",
        },
      };
    }

    // Base query conditions
    const queryConditions = {
      isApproved: true,
      isVacated: true,
    };

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");

      queryConditions.$or = [
        { name: regex },
        { contact: regex },
        { "stayDetails.roomNumber": regex },
        { "stayDetails.sharingType": regex },
      ];
    }

    // Add rentType-specific filters
    if (rentType === "mess") {
      queryConditions.userType = "messOnly";
    } else if (rentType) {
      queryConditions.rentType = rentType;
      queryConditions.userType = { $in: ["student", "worker", "dailyRent"] };
    }

    // Property filtering logic
    if (propertyId && propertyId !== "null") {
      if (rentType === "mess") {
        const accessibleKitchens = await getAccessibleKitchens(propertyId);
        const kitchenIds = accessibleKitchens.map((k) => k._id.toString());
        queryConditions["messDetails.kitchenId"] = { $in: kitchenIds };
      } else {
        queryConditions["stayDetails.propertyId"] = propertyId;
      }
    }

    // Projection to reduce data transfer
    const projection = {
      name: 1,
      residentId: 1,
      email: 1,
      contact: 1,
      userType: 1,
      rentType: 1,
      profileCompletion: 1,
      currentStatus: 1,
      paymentStatus: 1,
      "messDetails.kitchenName": 1,
      "messDetails.mealType": 1,
      "messDetails.rent": 1,
      "messDetails.messStartDate": 1,
      "messDetails.messEndDate": 1,
      "messDetails.noOfDays": 1,
      "financialDetails.totalAmount": 1,
      "financialDetails.pendingAmount": 1,
      "financialDetails.fines": 1,
      "stayDetails.roomNumber": 1,
      "stayDetails.propertyName": 1,
      "stayDetails.sharingType": 1,
      "financialDetails.monthlyRent": 1,
      "stayDetails.dailyRent": 1,
      "stayDetails.checkInDate": 1,
      "stayDetails.checkOutDate": 1,
      "stayDetails.noOfDays": 1,
      "financialDetails.pendingRent": 1,
      "financialDetails.nextDueDate": 1,
      statusRequests: 1,
      createdAt: 1,
      vacatedAt: 1,
    };

    // Get total count for pagination metadata
    const totalCount = await User.countDocuments(queryConditions);

    const totalPages = Math.ceil(totalCount / limitNumber);
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch users
    const users = await User.find(queryConditions)
      .select(projection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();
    // Format response
    const formattedUsers = users.map((user) => {
      const fines = user.financialDetails?.fines || [];

      const outstandingFines = fines
        .filter((fine) => !fine.paid)
        .reduce((sum, fine) => sum + (fine.amount || 0), 0);

      return {
        _id: user._id,
        name: user.name,
        residentId: user.residentId,
        email: user.email,
        contact: user.contact,
        userType: user.userType,
        rentType: user.rentType,
        profileCompletion: user.profileCompletion,
        currentStatus: user.currentStatus,
        paymentStatus: user.paymentStatus,
        kitchenName: user.messDetails?.kitchenName,
        mealType: user.messDetails?.mealType,
        messStartDate: user.messDetails?.messStartDate,
        messEndDate: user.messDetails?.messEndDate,
        noOfDaysMess: user.messDetails?.noOfDays,
        totalAmount: user.financialDetails?.totalAmount,
        pendingAmount: user.financialDetails?.pendingAmount,
        roomNumber: user.stayDetails?.roomNumber,
        propertyName: user.stayDetails?.propertyName,
        sharingType: user.stayDetails?.sharingType,
        monthlyRent: user.financialDetails?.monthlyRent,
        dailyRent: user.stayDetails?.dailyRent,
        checkInDate: user.stayDetails?.checkInDate,
        checkOutDate: user.stayDetails?.checkOutDate,
        noOfDaysDaily: user.stayDetails?.noOfDays,
        rent: user.messDetails?.rent,
        pendingRent: user.financialDetails?.pendingRent,
        nextDueDate: user.financialDetails?.nextDueDate,
        fines,
        outstandingFines,
        joinedDate: user.createdAt,
        vacatedAt: user.vacatedAt,
        statusRequests: user.statusRequests,
      };
    });

    return {
      status: 200,
      body: {
        success: true,
        pagination: {
          total: totalCount,
          totalPages,
          currentPage: pageNumber,
          itemsPerPage: limitNumber,
          hasNextPage: pageNumber < totalPages,
          hasPreviousPage: pageNumber > 1,
        },
        data: formattedUsers,
      },
    };
  } catch (error) {
    console.error("Error fetching users by rentType:", error);
    return {
      status: 500,
      body: {
        success: false,
        error: "Server error while fetching users",
      },
    };
  }
};

export const vacateUser = async (data) => {
  try {
    const { adminName, id } = data;
    const result = await vacateUserById(id);
    console.log(result);
    try {
      await UserLog.create({
        userId: id,
        action: "delete",
        changedByName: adminName || "Unknown Admin",
        message: `Resident (${result.name}) checked out by ${
          adminName || "Unknown Admin"
        } from ${
          result.propertyName || result.kitchenName || "Unknown Property"
        }`,
        propertyId: result.propertyId || null,
        kitchenId: result.kitchenId || null,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error("Failed to save vacate log:", logError);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "Resident vacated successfully",
        data: result,
      },
    };
  } catch (error) {
    return {
      status: error.status || 500,
      body: {
        success: false,
        message: error.message || "Error vacating resident",
      },
    };
  }
};

export const rejoinUser = async (data) => {
  try {
    // const {adminName} = req.query;

    const {
      id,
      userType,
      rentType,
      propertyId,
      propertyName,

      // For MessOnly
      kitchenId,
      kitchenName,

      roomId,

      // Financial fields
      rent,
      monthlyRent,
      nonRefundableDeposit,
      refundableDeposit,

      // Type-specific dates
      joinDate,
      messDetails,
      stayDetails,
      financialDetails,
      noOfDays,
      updatedBy,
    } = data;
    console.log("hererereer");
    console.log(data);

    const user = await User.findById(id);

    if (!user) {
      return {
        status: 404,
        body: { success: false, message: "User not found" },
      };
    }

    // Move existing details to serviceHistory before overwriting
    if (shouldArchiveCurrentStay(user)) {
      user.serviceHistory.push(createServiceHistoryEntry(user));
    }

    // Reset user status
    user.userType = userType || user.userType;
    user.rentType = rentType || user.rentType;
    user.isVacated = false;
    user.isLoginEnabled = true;
    user.vacatedAt = null;
    user.currentStatus = "checked_in";
    user.paymentStatus = "pending";
    user.stayDetails.depositAmountPaid = 0;
    user.stayDetails.depositStatus = "pending";
    user.currentStatusRequest = null;

    let roomAssignment;
    // Assign room only for non-MessOnly users
    if (userType !== "messOnly") {
      roomAssignment = await assignRoomToUser({
        userId: user._id,
        roomId,
        userType: rentType === "monthly" ? "longTermResident" : "dailyRenter",
      });
      console.log("roommmmmmm");
      console.log(roomAssignment);
      console.log("roommmmmmm");
    }

    // Update type-specific details
    if (userType === "messOnly") {
      // Handle MessOnly user rejoin
      user.messDetails = {
        kitchenId: kitchenId || user.messDetails.kitchenId,
        kitchenName: kitchenName || user.messDetails.kitchenName,
        mealType: messDetails.mealType || "",
        rent: messDetails.rent,
        messStartDate: messDetails.messStartDate
          ? new Date(messDetails.messStartDate)
          : new Date(),
        messEndDate: messDetails.messEndDate
          ? new Date(messDetails.messEndDate)
          : calculateEndDate(messDetails.messEndDate, messDetails.noOfDays),
        noOfDays: messDetails.noOfDays || 30, // Default 30 days
      };
      user.financialDetails = {
        totalAmount: messDetails.rent * (messDetails.noOfDays || 30),
        pendingAmount: messDetails.rent * (messDetails.noOfDays || 30),
        accountBalance: 0,
        // ...(user.financialDetails || {}),
      };
    } else {
      // Handle Monthly/Daily residents
      user.stayDetails = {
        ...user.stayDetails,
        propertyId,
        propertyName,
        sharingType: roomAssignment.body?.room?.sharingType,
        roomNumber: roomAssignment.body?.room?.roomNo,
        roomId,
        monthlyRent,
        nonRefundableDeposit,
        refundableDeposit,
        ...(rentType === "monthly" && {
          monthlyRent: Number(monthlyRent),
          joinDate: joinDate ? new Date(joinDate) : new Date(),
        }),
        ...(rentType === "daily" && {
          dailyRent: stayDetails?.dailyRent,
          extendDate: null,
          extendedDays: null,
          checkInDate: stayDetails.checkInDate
            ? new Date(stayDetails?.checkInDate)
            : new Date(),
          checkOutDate: stayDetails?.checkOutDate
            ? new Date(stayDetails?.checkOutDate)
            : calculateEndDate(serviceStartDate, noOfDays),
          noOfDays: stayDetails?.noOfDays || 1,
        }),
      };

      if (rentType === "monthly") {
        user.financialDetails = {
          ...user.financialDetails,
          monthlyRent: Number(monthlyRent),
          pendingRent: Number(monthlyRent),
          accountBalance: 0,
          clearedTillMonth: "",
          nextDueDate: joinDate ? new Date(joinDate) : new Date(),
          paymentDueSince: joinDate ? new Date(joinDate) : new Date(),
        };
      } else if (rentType === "daily") {
        user.financialDetails = {
          // totalAmount: rent * (noOfDays || 1),
          // pendingAmount: rent * (noOfDays || 1),
          totalAmount: financialDetails?.totalAmount,
          pendingAmount: financialDetails?.totalAmount,
          accountBalance: 0,
          // ...(user.financialDetails || {}),
        };
      }
    }
    console.log(user);
    await user.save();

    try {
      await UserLog.create({
        userId: user._id,
        action: "create",
        changedByName: updatedBy || "Unknown Admin",
        message: `Resident (${user.name}) rejoined by ${
          updatedBy || "Unknown Admin"
        } to ${
          userType === "messOnly"
            ? user.messDetails.kitchenName
            : user.stayDetails.propertyName
        } (${userType} rent type)`,
        propertyId: user.stayDetails?.propertyId || null,
        kitchenId: user.messDetails?.kitchenId || null,
      });
    } catch (logError) {
      console.error("Failed to save rejoin log:", logError);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "User rejoined successfully",
        data: {
          _id: user._id,
          name: user.name,
          userType: user.userType,
          rentType: user.rentType,
          currentStatus: user.currentStatus,
          ...(userType === "messOnly"
            ? {
                kitchenName: user.messDetails.kitchenName,
                messStartDate: user.messDetails.messStartDate,
              }
            : {
                roomNumber: user.stayDetails.roomNumber,
                joinDate:
                  user.stayDetails.joinDate || user.stayDetails.checkInDate,
              }),
        },
      },
    };
  } catch (error) {
    console.error("Error rejoining user:", error);
    return {
      status: 500,
      body: {
        success: false,
        message: "Server error during rejoin",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
    };
  }
};

export const getUserIds = async (data) => {
  try {
    const { messOnly, studentOnly, dailyRentOnly, workerOnly } = data;

    const filters = [];

    const projection = { _id: 1 };

    // Build filters based on query params
    if (studentOnly === "true") {
      filters.push({
        isBlocked: false,
        isVacated: false,
        userType: "student",
      });
    }

    if (messOnly === "true") {
      filters.push({
        isBlocked: false,
        isVacate: false, // Note: this may be a typo; should it be isVacated?
        userType: "messOnly",
      });
    }

    if (dailyRentOnly === "true") {
      filters.push({
        isBlocked: false,
        isVacated: false,
        userType: "dailyRent",
      });
    }

    if (workerOnly === "true") {
      filters.push({
        isBlocked: false,
        isVacated: false,
        userType: "worker",
      });
    }

    let users;

    if (filters.length > 0) {
      // If any filter is applied, use $or to fetch matching users
      users = await User.find({ $or: filters }, projection);
    } else {
      // No filter: get all non-blocked, non-vacated users
      users = await User.find(
        {
          isBlocked: false,
          isVacated: false,
        },
        projection
      );
    }

    const userIds = users.map((user) => user._id.toString());

    return {
      status: 200,
      body: userIds,
    };
  } catch (err) {
    console.error("Error fetching user IDs:", err);
    return {
      status: 500,
      body: { message: "Internal server error" },
    };
  }
};

export const getUsersForNotification = async (data) => {
  try {
    const { propertyId } = data;
    const query = { isHeavens: true };
    if (propertyId) query.propertyId = propertyId;

    const users = await User.find(query).select("_id").lean();

    const userIds = users.map((user) => user._id);

    return {
      status: 200,
      body: userIds,
    };
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return {
      status: 500,
      body: {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
    };
  }
};

export const getTodayCheckouts = async (data) => {
  try {
    const { type, propertyId } = data;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Common fields to select
    const commonFields =
      "name contact userType paymentStatus financialDetails.totalAmount financialDetails.pendingAmount";

    // Fetch Daily Rent users
    const fetchDailyRent = async () => {
      const query = {
        userType: "dailyRent",
        isVacated: false,
        $or: [
          // Due today (checkout date, no extend date)
          {
            "stayDetails.checkOutDate": { $gte: todayStart, $lte: todayEnd },
            "stayDetails.extendDate": { $exists: false },
          },
          // Due today (extend date)
          {
            "stayDetails.extendDate": { $gte: todayStart, $lte: todayEnd },
          },
          // Overdue past checkout with no extend date
          {
            "stayDetails.checkOutDate": { $lt: todayStart },
            "stayDetails.extendDate": { $exists: false },
          },
          // Overdue past extend date
          {
            "stayDetails.extendDate": { $lt: todayStart },
          },
        ],
      };

      if (propertyId && propertyId !== "null") {
        query["stayDetails.propertyId"] = propertyId;
      }

      const users = await User.find(query)
        .select(
          `${commonFields} stayDetails.roomNumber stayDetails.sharingType stayDetails.dailyRent stayDetails.checkInDate stayDetails.checkOutDate stayDetails.extendDate`
        )
        .lean();

      return users.map((user) => {
        const stay = user.stayDetails || {};
        return {
          _id: user._id,
          name: user.name,
          userType: user.userType,
          contact: user.contact,
          roomNumber: stay.roomNumber,
          sharingType: stay.sharingType,
          checkInDate: stay.checkInDate,
          checkOutDate: stay.checkOutDate,
          extendDate: stay.extendDate,
          rent: stay.dailyRent,
          totalAmount: user.financialDetails?.totalAmount || 0,
          pendingAmount: user.financialDetails?.pendingAmount || 0,
          paymentStatus: user.paymentStatus || "pending",
          isExtended: !!stay.extendDate,
        };
      });
    };

    // Fetch Mess Only users
    const fetchMessOnly = async () => {
      const query = {
        userType: "messOnly",
        isVacated: false,
        $or: [
          // Due today (mess end date, no extend date)
          {
            "messDetails.messEndDate": { $gte: todayStart, $lte: todayEnd },
            "messDetails.extendDate": { $exists: false },
          },
          // Due today (extend date)
          {
            "messDetails.extendDate": { $gte: todayStart, $lte: todayEnd },
          },
          // Overdue past mess end date with no extend date
          {
            "messDetails.messEndDate": { $lt: todayStart },
            "messDetails.extendDate": { $exists: false },
          },
          // Overdue past extend date
          {
            "messDetails.extendDate": { $lt: todayStart },
          },
        ],
      };

      const users = await User.find(query)
        .select(
          `${commonFields} messDetails.kitchenName messDetails.kitchenId messDetails.rent messDetails.messStartDate messDetails.messEndDate messDetails.extendDate`
        )
        .lean();

      let filteredUsers = users;

      if (propertyId && propertyId !== "null") {
        const kitchenIds = users
          ?.map((u) => u.messDetails?.kitchenId)
          ?.filter(Boolean);

        if (kitchenIds.length > 0) {
          const accessibleKitchens = await getAccessibleKitchens(propertyId);
          const accessibleKitchenIds = accessibleKitchens.data?.map((k) =>
            k._id.toString()
          );
          filteredUsers = users?.filter((u) =>
            accessibleKitchenIds?.includes(u.messDetails?.kitchenId?.toString())
          );
        } else {
          filteredUsers = [];
        }
      }

      return filteredUsers?.map((user) => {
        const mess = user.messDetails || {};
        return {
          _id: user._id,
          name: user.name,
          userType: user.userType,
          contact: user.contact,
          kitchenName: mess.kitchenName,
          messStartDate: mess.messStartDate,
          messEndDate: mess.messEndDate,
          extendDate: mess.extendDate,
          rent: mess.rent,
          totalAmount: user.financialDetails?.totalAmount || 0,
          pendingAmount: user.financialDetails?.pendingAmount || 0,
          paymentStatus: user.paymentStatus || "pending",
          isExtended: !!mess.extendDate,
        };
      });
    };

    let dailyRentData = [];
    let messOnlyData = [];

    if (!type) {
      [dailyRentData, messOnlyData] = await Promise.all([
        fetchDailyRent(),
        fetchMessOnly(),
      ]);
    } else if (type === "dailyRent") {
      dailyRentData = await fetchDailyRent();
    } else if (type === "messOnly") {
      messOnlyData = await fetchMessOnly();
    } else {
      return {
        status: 400,
        body: {
          success: false,
          error: "Invalid 'type' parameter. Use 'dailyRent' or 'messOnly'.",
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        count: dailyRentData.length + messOnlyData.length,
        data: {
          dailyRent: dailyRentData,
          messOnly: messOnlyData,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching checkouts:", error);
    return {
      status: 500,
      body: {
        success: false,
        error: "Server error while fetching checkouts",
        details: error.message,
      },
    };
  }
};

export const extendUserDays = async (data) => {
  try {
    const { id, extendDate, additionalDays, newRentAmount, adminName } = data;
    console.log(data);

    // Validate input
    if (!additionalDays || additionalDays < 1) {
      return {
        status: 400,
        body: {
          success: false,
          error: "Additional days must be at least 1",
        },
      };
    }

    const user = await User.findById(id);
    if (!user) {
      return {
        status: 404,
        body: {
          success: false,
          error: "User not found",
        },
      };
    }

    let updateResult;
    const now = new Date();

    if (user.userType === "dailyRent") {
      // For Daily Renters
      const currentDailyRate = newRentAmount || user.stayDetails.dailyRent;
      const extensionAmount = currentDailyRate * additionalDays;

      updateResult = await User.findByIdAndUpdate(
        id,
        {
          $inc: {
            "stayDetails.noOfDays": additionalDays,
            "stayDetails.extendedDays": additionalDays,
            "financialDetails.totalAmount": extensionAmount,
            "financialDetails.pendingAmount": extensionAmount,
          },
          $set: {
            "stayDetails.extendDate": extendDate ? new Date(extendDate) : now,
            // "stayDetails.checkOutDate": extendDate ? new Date(extendDate) : now,
            "stayDetails.dailyRent": currentDailyRate, // Update rate if changed
          },
        },
        { new: true }
      );
    } else if (user.userType === "messOnly") {
      // For MessOnly users
      const currentMessRate = newRentAmount || user.messDetails.rent;
      const extensionAmount = currentMessRate * additionalDays;

      updateResult = await User.findByIdAndUpdate(
        id,
        {
          $inc: {
            "messDetails.noOfDays": additionalDays,
            "messDetails.extendedDays": additionalDays,
            "financialDetails.totalAmount": extensionAmount,
            "financialDetails.pendingAmount": extensionAmount,
          },
          $set: {
            "messDetails.extendDate": extendDate ? new Date(extendDate) : now,
            // "messDetails.messEndDate": calculateNewEndDate(
            //   user.messDetails.messEndDate,
            //   additionalDays
            // ),
            "messDetails.rent": currentMessRate, // Update rate if changed
          },
        },
        { new: true }
      );
    } else {
      return {
        status: 400,
        body: {
          success: false,
          error:
            "Stay extension only available for DailyRent and MessOnly users",
        },
      };
    }
    try {
      await UserLog.create({
        userId: user._id,
        action: "extend",
        changedByName: adminName || "Unknown Admin",
        message: `Resident (${user.name}) ${
          user.userType === "messOnly" ? "mess subscription" : "stay"
        } extended by ${additionalDays} days by ${
          adminName || "Unknown Admin"
        } in ${
          user.userType === "messOnly"
            ? updateResult.messDetails.kitchenName
            : updateResult.stayDetails.propertyName
        }. New rate: ₹${
          user.userType === "messOnly"
            ? updateResult.messDetails.rent
            : updateResult.stayDetails.dailyRent
        }`,
        propertyId: updateResult.stayDetails?.propertyId || null,
        kitchenId: updateResult.messDetails?.kitchenId || null,
      });
    } catch (logError) {
      console.error("Failed to save stay extension log:", logError);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: `Stay extended by ${additionalDays} days successfully`,
        data: {
          userId: updateResult._id,
          newEndDate:
            user.userType === "dailyRent"
              ? updateResult.stayDetails.checkOutDate
              : updateResult.messDetails.messEndDate,
          totalAmount: updateResult.financialDetails.totalAmount,
          pendingAmount: updateResult.financialDetails.pendingAmount,
          extendedDays: additionalDays,
        },
      },
    };
  } catch (error) {
    console.error("Error extending stay:", error);
    return {
      status: 500,
      body: {
        success: false,
        error: "Server error during stay extension",
      },
    };
  }
};

export const createStatusRequest = async (data) => {
  try {
    const { id, type, reason, isInstantCheckout } = data;

    // Validate request type
    const allowedTypes = ["checked_in", "on_leave", "checked_out"];
    if (!allowedTypes.includes(type)) {
      return {
        status: 400,
        body: { error: "Invalid request type" },
      };
    }

    // Fetch user
    const user = await User.findById(id).select(
      "paymentStatus stayDetails.depositStatus currentStatus currentStatusRequest"
    );

    if (!user) {
      return {
        status: 404,
        body: { error: "User not found" },
      };
    }

    if (user.currentStatus === type) {
      return {
        status: 400,
        body: {
          error: `You are already marked as "${type}". Cannot submit the same request.`,
        },
      };
    }

    // Prevent duplicate pending requests
    if (user.currentStatusRequest?.status === "pending") {
      return {
        status: 400,
        body: {
          error:
            "You already have a pending request. Please wait for it to be processed.",
        },
      };
    }

    // Additional validation for checkout requests
    if (type === "checked_out") {
      if (
        user.paymentStatus === "pending" ||
        user.stayDetails?.depositStatus === "pending"
      ) {
        return {
          status: 400,
          body: {
            error:
              "Cannot request checkout while payment or deposit is pending.",
          },
        };
      }
    }

    // 🧩 Base new request object
    const newRequest = {
      type,
      reason: reason || "",
      status: "pending",
      requestedAt: new Date(),
    };

    if (type === "checked_out") {
      const requestedAt = new Date();

      if (isInstantCheckout === true) {
        // Case 1: Instant checkout
        newRequest.isInstantCheckout = true;
        newRequest.effectiveDate = null;
        newRequest.isRefundEligible = false;
      } else {
        // Case 2: Scheduled checkout (30 days later)
        const effectiveDate = new Date(requestedAt);
        effectiveDate.setDate(effectiveDate.getDate() + 30);

        newRequest.isInstantCheckout = false;
        newRequest.effectiveDate = effectiveDate;
        newRequest.isRefundEligible = false;
      }
    }

    // Save request
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $push: { statusRequests: newRequest },
        $set: { currentStatusRequest: newRequest },
      },
      { new: true }
    );

    return {
      status: 201,
      body: {
        message: "Request submitted successfully",
        request:
          updatedUser.statusRequests[updatedUser.statusRequests.length - 1],
      },
    };
  } catch (error) {
    console.error("Error creating status request:", error);
    return {
      status: 500,
      body: { error: "Error submitting request" },
    };
  }
};

export const getPendingStatusRequests = async (data) => {
  try {
    const { propertyId, type, userType, sortBy, sortOrder } = data;

    const propertyFilter = propertyId
      ? { "stayDetails.propertyId": new mongoose.Types.ObjectId(propertyId) }
      : {};

    const userTypeFilter = userType ? { userType } : {};

    const aggregation = [
      {
        $match: {
          ...propertyFilter,
          ...userTypeFilter,
        },
      },
      { $unwind: "$statusRequests" },
      {
        $match: {
          "statusRequests.status": "pending",
          ...(type && { "statusRequests.type": type }),
        },
      },
      {
        $sort: {
          [`statusRequests.${sortBy || "createdAt"}`]:
            sortOrder === "asc" ? 1 : -1,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          contact: 1,
          userType: 1,
          currentStatus: 1,
          paymentStatus: 1,
          profileImage: "$personalDetails.profileImg",
          propertyId: "$stayDetails.propertyId",
          propertyName: "$stayDetails.propertyName",
          roomNumber: "$stayDetails.roomNumber",
          refundableDeposit: "$stayDetails.refundableDeposit",
          request: "$statusRequests",
        },
      },
    ];

    let results = await User.aggregate(aggregation);

    // 🔹 Process each user's latest pending request
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    for (const record of results) {
      const userId = record._id;
      const latestRequest = record.request; // since we already sort by createdAt desc, this is latest

      if (
        latestRequest?.type === "checked_out" &&
        latestRequest?.effectiveDate
      ) {
        const effective = new Date(latestRequest.effectiveDate);
        effective.setUTCHours(0, 0, 0, 0);

        if (effective.getTime() <= todayUTC.getTime()) {
          // ✅ eligible for refund
          await User.updateOne(
            {
              _id: userId,
              "statusRequests._id": latestRequest._id,
            },
            {
              $set: { "statusRequests.$.isRefundEligible": true },
            }
          );

          // Also reflect in returned data
          record.request.isRefundEligible = true;
        }
      }
    }

    return {
      status: 200,
      body: {
        success: true,
        total: results.length,
        data: results,
      },
    };
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return {
      status: 500,
      body: {
        success: false,
        error: "Server error while fetching requests",
      },
    };
  }
};

export const respondToStatusRequest = async (data) => {
  try {
    const { id, requestId, status, comment, adminName } = data;
    console.log(data);
    if (!["approved", "rejected"].includes(status)) {
      return {
        status: 400,
        body: { error: "Invalid status value" },
      };
    }

    const user = await User.findById(id);
    if (!user) {
      return {
        status: 404,
        body: { error: "Request not found" },
      };
    }

    const request = user.statusRequests.find((r) => r._id.equals(requestId));
    if (!request) {
      return {
        status: 404,
        body: { error: "Status request not found" },
      };
    }

    const requestType = request.type;

    request.status = status;
    request.reviewerComment = comment || "";
    request.reviewedAt = new Date();
    request.reviewedBy = adminName;

    user.currentStatusRequest = {
      type: requestType,
      status,
    };

    if (status === "approved") {
      switch (requestType) {
        case "checked_out":
          await vacateUserById(user._id);
          break;
        case "checked_in":
          user.currentStatus = "checked_in";
          // user.isBlocked = false;
          break;
        case "on_leave":
          user.currentStatus = "on_leave";
          // user.isBlocked = true;
          break;
      }
    }

    await user.save();

    const userIdsToNotify = ["688722e075ee06d71c8fdb02"];

    userIdsToNotify.push(user._id);
    console.log(userIdsToNotify);
    const socket = await sendRPCRequest(SOCKET_PATTERN.EMIT, {
      userIds: userIdsToNotify,
      event: "current-status",
      data: user,
    });

    return {
      status: 200,
      body: {
        success: true,
        message: `Request ${status} successfully`,
        data: {
          userId: user._id,
          requestType,
          newStatus: user.currentStatus,
          currentStatusRequest: user.currentStatusRequest,
        },
      },
    };
  } catch (error) {
    console.error("Error responding to request:", error);
    return {
      status: 500,
      body: {
        success: false,
        error: "Error processing request",
      },
    };
  }
};

export const getUserStatusRequests = async (data) => {
  try {
    const { id, type, status } = data;

    const user = await User.findById(id).select("statusRequests");

    if (!user) {
      return {
        status: 404,
        body: { error: "User not found" },
      };
    }

    let requests = user.statusRequests;

    if (type) {
      requests = requests.filter((req) => req.type === type);
    }
    if (status) {
      requests = requests.filter((req) => req.status === status);
    }

    requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    return {
      status: 200,
      body: {
        total: requests.length,
        requests,
      },
    };
  } catch (error) {
    console.error("Error fetching requests:", error);
    return {
      status: 500,
      body: { error: "Error fetching requests" },
    };
  }
};

export const handleBlockStatus = async (data) => {
  try {
    const { id, action, extendDate, adminName } = data;

    // Validate input
    if (action === "unblock" && !extendDate) {
      return {
        status: 400,
        body: {
          success: false,
          error: "extendDate is required when unblocking",
        },
      };
    }

    // Validate date is in the future if provided
    if (extendDate && new Date(extendDate) <= new Date()) {
      return {
        status: 400,
        body: {
          success: false,
          error: "extendDate must be in the future",
        },
      };
    }

    const updates = {};
    let message = "";

    if (action === "block") {
      updates.isBlocked = true;
      updates.isAccessBlockExtendDate = null;
      message = "User blocked successfully";
    } else if (action === "unblock") {
      updates.isBlocked = false;
      updates.isAccessBlockExtendDate = new Date(extendDate);
      message = `User unblocked with access extended until ${new Date(
        extendDate
      ).toDateString()}`;
    } else {
      return {
        status: 400,
        body: {
          success: false,
          error: "Invalid action. Use 'block' or 'unblock'",
        },
      };
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true });

    if (!user) {
      return {
        status: 404,
        body: {
          success: false,
          error: "User not found",
        },
      };
    }

    try {
      await UserLog.create({
        userId: user._id,
        action: action === "block" ? "block_user" : "unblock_user",
        changedByName: adminName || "Unknown Admin",
        message:
          action === "block"
            ? `Resident (${user.name}) blocked by ${
                adminName || "Unknown Admin"
              } in ${
                user.userType === "messOnly"
                  ? user.messDetails?.kitchenName
                  : user.stayDetails?.propertyName
              }`
            : `Resident (${user.name}) unblocked by ${
                adminName || "Unknown Admin"
              } in ${
                user.userType === "messOnly"
                  ? user.messDetails?.kitchenName
                  : user.stayDetails?.propertyName
              } with access extended until ${new Date(
                extendDate
              ).toDateString()}`,
        propertyId:
          user.userType === "messOnly"
            ? null
            : user.stayDetails?.propertyId || null,
        kitchenId:
          user.userType === "messOnly"
            ? user.messDetails?.kitchenId || null
            : null,
      });
    } catch (logError) {
      console.error("Failed to save block/unblock log:", logError);
    }

    return {
      status: 200,
      body: {
        success: true,
        message,
        data: {
          isBlocked: user.isBlocked,
          isAccessBlockExtendDate: user.isAccessBlockExtendDate,
        },
      },
    };
  } catch (error) {
    console.error("Error handling block status:", error);
    return {
      status: 500,
      body: {
        success: false,
        error: "Server error while updating block status",
      },
    };
  }
};

export const setResetToken = async (data) => {
  const { userId, token, expiry } = data;

  await User.updateOne(
    { _id: userId },
    { resetPasswordToken: token, resetPasswordExpires: expiry }
  );
  return { success: true };
};

export const getUserByResetToken = async (data) => {
  const user = await User.findOne({
    resetPasswordToken: data.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return { success: false, status: 400, message: "Invalid or expired token" };
  }

  return { success: true, status: 200, data: user };
};

export const updatePassword = async ({ userId, password }) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  await User.updateOne(
    { _id: userId },
    {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    }
  );

  return {
    success: true,
    status: 200,
    message: "Password updated successfully",
  };
};

export const updateUser = async (data) => {
  try {
    const { userId, userData } = data;
    console.log("userData", userData);

    const user = await User.findByIdAndUpdate(userId, userData, { new: true });
    if (!user) {
      return {
        status: 404,
        body: {
          success: false,
          error: "User not found",
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "User updated successfully",
        data: user,
      },
    };
  } catch (err) {
    console.error("Error handling update user:", err);
    return {
      status: 500,
      body: {
        success: false,
        error: "Server error while updating user",
      },
    };
  }
};

export const getAllPaymentPendingUsers = async (data) => {
  try {
    const {
      propertyId,
      rentType,
      userType,
      search,
      page = 1,
      limit = 10,
    } = data;

    const query = {
      paymentStatus: "pending",
      isVacated: { $ne: true },
    };

    if (propertyId) {
      query["stayDetails.propertyId"] = new mongoose.Types.ObjectId(propertyId);
    }

    if (rentType) {
      query.rentType = rentType;
    }

    if (userType) {
      query.userType = userType;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { contact: regex }];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let projection = {
      name: 1,
      contact: 1,
      "stayDetails.roomNumber": 1,
    };

    if (rentType === "monthly") {
      projection["userType"] = 1;
      projection["stayDetails.joinDate"] = 1;
      projection["financialDetails.monthlyRent"] = 1;
      projection["financialDetails.pendingRent"] = 1;
      projection["financialDetails.clearedTillMonth"] = 1;
    } else if (rentType === "daily") {
      projection["stayDetails.checkInDate"] = 1;
      projection["stayDetails.checkOutDate"] = 1;
      projection["financialDetails.totalAmount"] = 1;
      projection["financialDetails.pendingAmount"] = 1;
    } else if (rentType === "mess") {
      projection["messDetails.messStartDate"] = 1;
      projection["messDetails.messEndDate"] = 1;
      projection["financialDetails.totalAmount"] = 1;
      projection["financialDetails.pendingAmount"] = 1;
    }

    const [users, total] = await Promise.all([
      User.find(query).select(projection).skip(skip).limit(limitNum).lean(),
      User.countDocuments(query),
    ]);

    let totalPending = 0;
    if (rentType === "monthly") {
      const agg = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalPending: { $sum: "$financialDetails.pendingRent" },
          },
        },
      ]);
      totalPending = agg[0]?.totalPending || 0;
    } else if (["daily", "mess"].includes(rentType)) {
      const agg = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalPending: { $sum: "$financialDetails.pendingAmount" },
          },
        },
      ]);
      totalPending = agg[0]?.totalPending || 0;
    }

    if (!users.length) {
      return {
        success: true,
        status: 200,
        totalPending: 0,
        data: [],
        pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 },
      };
    }

    // Collect userIds
    const userIds = users.map((u) => u._id.toString());

    // 🔥 Call Accounts service to get latest payments
    const paymentsResponse = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_LATEST_BY_USERS,
      { userIds }
    );

    const paymentsMap = {};
    if (paymentsResponse?.success && Array.isArray(paymentsResponse.data)) {
      paymentsResponse.data.forEach((p) => {
        paymentsMap[p.userId] = {
          lastPaidDate: p.paymentDate,
          amountPaid: p.amount,
        };
      });
    }

    // Flatten & merge payment info
    const formattedUsers = users.map((u) => {
      const paymentInfo = paymentsMap[u._id.toString()] || {};
      return {
        name: u.name,
        contact: u.contact,
        roomNumber: u.stayDetails?.roomNumber || null,

        ...(rentType === "monthly" && {
          userType: u.userType,
          joinDate: u.stayDetails?.joinDate || null,
          monthlyRent: u.financialDetails?.monthlyRent || null,
          pendingRent: u.financialDetails?.pendingRent || null,
          rentClearedMonth: u.financialDetails?.clearedTillMonth || null,
        }),
        ...(rentType === "daily" && {
          checkInDate: u.stayDetails?.checkInDate || null,
          checkOutDate: u.stayDetails?.checkOutDate || null,
          totalAmount: u.financialDetails?.totalAmount || null,
          pendingAmount: u.financialDetails?.pendingAmount || null,
        }),
        ...(rentType === "mess" && {
          messStartDate: u.messDetails?.messStartDate || null,
          messEndDate: u.messDetails?.messEndDate || null,
          totalAmount: u.financialDetails?.totalAmount || null,
          pendingAmount: u.financialDetails?.pendingAmount || null,
        }),

        // merged from accounts service
        lastPaidDate: paymentInfo.lastPaidDate || null,
        lastPaidAmount: paymentInfo.amountPaid || null,
      };
    });

    return {
      success: true,
      status: 200,
      totalPending,
      data: formattedUsers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  } catch (error) {
    console.error("Get All Pending Payment users Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getResidentCounts = async (data) => {
  try {
    const { propertyId } = data;
    console.log("herererer");
    const filter = {
      isVacated: false,
    };

    if (propertyId) {
      filter["stayDetails.propertyId"] = propertyId;
    }

    const [monthlyResidents, dailyRenters] = await Promise.all([
      User.countDocuments({ ...filter, rentType: "monthly" }),
      User.countDocuments({ ...filter, rentType: "daily" }),
    ]);

    return { monthlyResidents, dailyRenters };
  } catch (error) {
    console.error("Error fetching resident counts:", error);
    return { error: "Failed to fetch resident counts" };
  }
};

export const getUsersWithBirthdayToday = async () => {
  try {
    console.log("Here");
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // getMonth() is 0-indexed
    const currentDay = today.getDate();

    const users = await User.aggregate([
      {
        $match: {
          "personalDetails.dob": { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          name: 1,
          month: { $month: "$personalDetails.dob" },
          day: { $dayOfMonth: "$personalDetails.dob" },
        },
      },
      {
        $match: {
          month: currentMonth,
          day: currentDay,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
        },
      },
    ]);

    return {
      success: true,
      status: 200,
      message: "Successfully retrieved users with birthdays today.",
      data: users,
    };
  } catch (error) {
    console.error("Error fetching users with birthday today:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getUserStatisticsForAccountDashboard = async (data) => {
  try {
    const { propertyId } = data;

    const matchCondition = {
      isApproved: true,
      isVacated: false,
    };
    if (propertyId) {
      matchCondition.$or = [
        { "stayDetails.propertyId": new mongoose.Types.ObjectId(propertyId) },
      ];

      const accessibleKitchensResponse = await getAccessibleKitchens({
        propertyId,
      });
      const accessibleKitchens = accessibleKitchensResponse?.data || [];

      const accessibleKitchenIds = accessibleKitchens.map((k) =>
        k._id.toString()
      );

      matchCondition.$or.push({
        "messDetails.kitchenId": {
          $in: accessibleKitchenIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      });
    }

    // ✅ Aggregate users by rentType with pending amount calculation
    const userStats = await User.aggregate([
      {
        $match: matchCondition,
      },
      {
        $group: {
          _id: "$rentType",
          userCount: { $sum: 1 },

          totalMonthlyRent: {
            $sum: {
              $cond: [
                { $eq: ["$rentType", "monthly"] },
                "$financialDetails.monthlyRent",
                0,
              ],
            },
          },
          totalMessAmount: {
            $sum: {
              $cond: [
                { $eq: ["$rentType", "mess"] },
                "$financialDetails.totalAmount",
                0,
              ],
            },
          },
          totalDailyAmount: {
            $sum: {
              $cond: [
                { $eq: ["$rentType", "daily"] },
                "$financialDetails.totalAmount",
                0,
              ],
            },
          },

          // ✅ New field: totalPendingAmount
          totalPendingAmount: {
            $sum: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $eq: ["$rentType", "monthly"] },
                        { $eq: ["$paymentStatus", "pending"] },
                      ],
                    },
                    then: "$financialDetails.pendingRent",
                  },
                  {
                    case: {
                      $and: [
                        { $eq: ["$rentType", "daily"] },
                        { $eq: ["$paymentStatus", "pending"] },
                      ],
                    },
                    then: "$financialDetails.pendingAmount",
                  },
                  {
                    case: {
                      $and: [
                        { $eq: ["$rentType", "mess"] },
                        { $eq: ["$paymentStatus", "pending"] },
                      ],
                    },
                    then: "$financialDetails.pendingAmount",
                  },
                ],
                default: 0,
              },
            },
          },
        },
      },
    ]);

    return {
      success: true,
      status: 200,
      data: userStats,
    };
  } catch (error) {
    console.error(
      "User Service - getUserStatisticsForAccountDashboard Error:",
      error
    );
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getUsersByAgencyService = async (data) => {
  try {
    const { agent } = data;
    console.log(data);
    if (!agent) {
      return {
        success: false,
        status: 400,
        message: "Agent is required.",
      };
    }

    const agencyId = new mongoose.Types.ObjectId(agent);

    // Fetch only required fields
    const users = await User.find(
      { agent: agencyId },
      {
        name: 1,
        contact: 1,
        commissionEarned: 1,
        "stayDetails.propertyId": 1,
        "stayDetails.monthlyRent": 1,
        "stayDetails.dailyRent": 1,
        "stayDetails.nonRefundableDeposit": 1,
        "stayDetails.refundableDeposit": 1,
        "stayDetails.depositAmountPaid": 1,
        "stayDetails.joinDate": 1,
      }
    ).lean();

    if (!users || users.length === 0) {
      return {
        success: false,
        status: 404,
        message: "No users found for the specified agency.",
      };
    }

    // Calculate total commissionEarned
    const totalCommission = users.reduce(
      (sum, user) => sum + (user.commissionEarned || 0),
      0
    );

    return {
      success: true,
      status: 200,
      message: "Users fetched successfully.",
      totalCommission,
      data: users,
    };
  } catch (error) {
    console.error("Get Users by Agency Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getUsersForMakingPayment = async (data) => {
  try {
    const { rentType, propertyId } = data;

    // Base query conditions
    const queryConditions = {
      isApproved: true,
      isVacated: false,
    };

    // Rent Type filter
    if (rentType) {
      if (rentType === "mess") {
        queryConditions.userType = "messOnly";
      } else {
        queryConditions.rentType = rentType;
        queryConditions.userType = { $in: ["student", "worker", "dailyRent"] };
      }
    }

    // Property filter
    if (propertyId && propertyId !== "null") {
      if (rentType === "mess") {
        const accessibleKitchens = await getAccessibleKitchens(propertyId);
        const kitchenIds = accessibleKitchens.map((k) => k._id.toString());
        queryConditions["messDetails.kitchenId"] = { $in: kitchenIds };
      } else {
        queryConditions["stayDetails.propertyId"] = propertyId;
      }
    }

    // Projection to reduce data transfer
    const projection = {
      name: 1,
      userType: 1,
      rentType: 1,
      paymentStatus: 1,
      "messDetails.kitchenName": 1,
      "messDetails.mealType": 1,
      "messDetails.messStartDate": 1,
      "messDetails.messEndDate": 1,
      "messDetails.rent": 1,
      "financialDetails.totalAmount": 1,
      "financialDetails.pendingAmount": 1,
      "financialDetails.fines": 1,
      "stayDetails.nonRefundableDeposit": 1,
      "stayDetails.refundableDeposit": 1,
      "stayDetails.depositStatus": 1,
      "stayDetails.depositAmountPaid": 1,
      "stayDetails.roomNumber": 1,
      "stayDetails.propertyName": 1,
      "stayDetails.joinDate": 1,
      "stayDetails.checkInDate": 1,
      "stayDetails.checkOutDate": 1,
      "stayDetails.noOfDays": 1,
      "stayDetails.sharingType": 1,
      "stayDetails.dailyRent": 1,
      "financialDetails.monthlyRent": 1,
      "financialDetails.pendingRent": 1,
      "financialDetails.nextDueDate": 1,
      createdAt: 1,
    };

    // Fetch users
    const users = await User.find(queryConditions)
      .select(projection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .lean();

    // Format response
    const formattedUsers = users.map((user) => {
      const fines = user.financialDetails?.fines || [];

      const outstandingFines = fines
        .filter((fine) => !fine.paid)
        .reduce((sum, fine) => sum + (fine.amount || 0), 0);

      return {
        _id: user._id,
        name: user.name,
        userType: user.userType,
        rentType: user.rentType,
        currentStatus: user.currentStatus,
        paymentStatus: user.paymentStatus,
        kitchenName: user.messDetails?.kitchenName,
        mealType: user.messDetails?.mealType,
        totalAmount: user.financialDetails?.totalAmount,
        pendingAmount: user.financialDetails?.pendingAmount,
        nonRefundableDeposit: user.stayDetails?.nonRefundableDeposit,
        refundableDeposit: user.stayDetails?.nonRefundableDeposit,
        depositAmount:
          user.stayDetails?.nonRefundableDeposit +
          user.stayDetails?.refundableDeposit,
        depositPaid: user.stayDetails?.depositAmountPaid,
        depositStatus: user.stayDetails?.depositStatus,
        roomNumber: user.stayDetails?.roomNumber,
        propertyName: user.stayDetails?.propertyName,
        sharingType: user.stayDetails?.sharingType,
        rent: user.stayDetails?.dailyRent || user.messDetails?.rent,
        monthlyRent: user.financialDetails?.monthlyRent,
        pendingRent: user.financialDetails?.pendingRent,
        nextDueDate: user.financialDetails?.nextDueDate,
        fines,
        outstandingFines,
        joinedDate: user.stayDetails?.joinDate,
        checkInDate: user.stayDetails?.checkInDate,
        checkOutDate: user.stayDetails?.checkOutDate,
        noOfDays: user.stayDetails?.noOfDays,
        messStartDate: user.messDetails?.messStartDate,
        messEndDate: user.messDetails?.messEndDate,
        noOfDaysForMessOnly: user.messDetails?.noOfDays,
      };
    });

    return {
      status: 200,
      body: {
        success: true,
        data: formattedUsers,
      },
    };
  } catch (error) {
    console.error(
      "Error fetching users by rentType for making payment:",
      error
    );
    return {
      status: 500,
      body: {
        success: false,
        error: "Server error while fetching users",
      },
    };
  }
};

export const getUserDepositStatisticsForAccountDashboard = async (data) => {
  try {
    const { propertyId } = data;

    // 🗓️ Current month date range
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // 🧮 Base filter (property + current month joinDate)
    const matchCondition = {
      rentType: "monthly",
      "stayDetails.joinDate": { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    };

    if (propertyId) {
      matchCondition["stayDetails.propertyId"] = new mongoose.Types.ObjectId(
        propertyId
      );
    }

    // ✅ Get all current-month users
    const users = await User.find(matchCondition)
      .select(
        "stayDetails.nonRefundableDeposit stayDetails.refundableDeposit stayDetails.depositStatus stayDetails.joinDate"
      )
      .lean();

    if (!users?.length) {
      return {
        success: true,
        status: 200,
        message: "No users joined this month",
        data: {
          currentMonthNonRefundable: 0,
          currentMonthRefundable: 0,
          currentMonthPending: 0,
          noOfCurrentMonthJoines: 0,
        },
      };
    }

    // 🧩 Initialize totals
    let currentMonthNonRefundable = 0;
    let currentMonthRefundable = 0;
    let currentMonthPending = 0;
    let noOfCurrentMonthJoines = users.length;

    // 🔹 Loop through and calculate
    for (const user of users) {
      const stay = user.stayDetails;
      if (!stay) continue;

      currentMonthNonRefundable += stay.nonRefundableDeposit || 0;
      currentMonthRefundable += stay.refundableDeposit || 0;

      // Count pending only for current-month users
      if (stay.depositStatus === "pending") {
        currentMonthPending +=
          (stay.nonRefundableDeposit || 0) + (stay.refundableDeposit || 0);
      }
    }

    // ✅ Return formatted response
    return {
      success: true,
      status: 200,
      message: "User deposit statistics (current month) fetched successfully",
      data: {
        currentMonthNonRefundable,
        currentMonthRefundable,
        currentMonthPending,
        noOfCurrentMonthJoines,
      },
    };
  } catch (error) {
    console.error(
      "User Service - getUserDepositStatisticsForAccountDashboard Error:",
      error
    );
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getPendingDepositPayments = async (data) => {
  try {
    const { propertyId, search, userType, page = 1, limit = 10 } = data;

    const query = {
      "stayDetails.depositStatus": "pending",
      isVacated: { $ne: true },
      rentType: "monthly",
    };

    // Filter by property
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      query["stayDetails.propertyId"] = new mongoose.Types.ObjectId(propertyId);
    }

    // Filter by userType (student / worker)
    if (userType) {
      query.userType = userType;
    }

    // Search filter (name or contact)
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { contact: regex }];
    }

    // Pagination setup
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Projection fields
    const projection = {
      name: 1,
      contact: 1,
      userType: 1,
      "stayDetails.joinDate": 1,
      "stayDetails.nonRefundableDeposit": 1,
      "stayDetails.refundableDeposit": 1,
      "stayDetails.depositAmountPaid": 1,
    };

    // Fetch filtered users
    const [users, total] = await Promise.all([
      User.find(query).select(projection).skip(skip).limit(limitNum).lean(),
      User.countDocuments(query),
    ]);

    const matchStage = {
      isVacated: false,
      isApproved: true,
    };

    // ✅ Apply property filter if provided
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      matchStage["stayDetails.propertyId"] = new mongoose.Types.ObjectId(
        propertyId
      );
    }

    const totals = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalNonRefundable: { $sum: "$stayDetails.nonRefundableDeposit" },
          totalRefundable: { $sum: "$stayDetails.refundableDeposit" },
        },
      },
    ]);

    const totalNonRefundable = totals[0]?.totalNonRefundable || 0;
    const totalRefundable = totals[0]?.totalRefundable || 0;

    if (!users.length) {
      return {
        success: true,
        status: 200,
        totalNonRefundable,
        totalRefundable,
        data: [],
        totalPendingAmount: 0,
        pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 },
      };
    }

    // Collect userIds for accounts service
    const userIds = users.map((u) => u._id.toString());

    // 🔥 Call Accounts service to get latest payments
    const depositsResponse = await sendRPCRequest(
      ACCOUNTS_PATTERN.DEPOSIT_PAYMENTS.GET_LATEST_DEPOSIT_PAYMENT_BY_USERID,
      { userIds }
    );

    const depositsMap = {};
    if (depositsResponse?.success && Array.isArray(depositsResponse.data)) {
      depositsResponse.data.forEach((p) => {
        depositsMap[p.userId] = {
          lastPaidDate: p.paymentDate,
          amountPaid: p.amountPaid,
          dueAmount: p.dueAmount,
        };
      });
    }

    // Flatten & merge payment info + calculate pending deposit
    let totalPendingAmount = 0;

    const formattedUsers = users.map((u) => {
      const depositInfo = depositsMap[u._id.toString()] || {};
      const stay = u.stayDetails || {};

      const nonRefundable = stay.nonRefundableDeposit || 0;
      const refundable = stay.refundableDeposit || 0;
      const paid = stay.depositAmountPaid || 0;

      const totalDeposit = nonRefundable + refundable;
      const pendingDeposit = totalDeposit - paid;

      totalPendingAmount += pendingDeposit;

      return {
        name: u.name,
        userType: u.userType,
        contact: u.contact,
        joinDate: stay.joinDate || null,
        totalDeposit,
        pendingDeposit,
        lastPaidDate: depositInfo.lastPaidDate || null,
        amountPaid: depositInfo.amountPaid || null,
        dueAmount: depositInfo.dueAmount || null,
      };
    });

    // ✅ Final response
    return {
      success: true,
      status: 200,
      totalNonRefundable,
      totalRefundable,
      totalPendingAmount,
      data: formattedUsers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  } catch (error) {
    console.error("Get Pending Deposit Payments Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const allocateUsersToAgent = async (data) => {
  try {
    const { agentId, userIds } = data;

    if (!agentId || !Array.isArray(userIds) || userIds.length === 0) {
      return {
        success: false,
        status: 400,
        message: "Agent ID and user IDs are required.",
      };
    }

    // Bulk update: assign the agent to each user
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { agent: agentId } }
    );

    return {
      success: true,
      status: 200,
      message: `Successfully allocated ${result.modifiedCount} users to the agent.`,
      data: result,
    };
  } catch (error) {
    console.error("Allocate Users Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const allocateCommissionToUsers = async (data) => {
  try {
    const { userIds = [], amountPerUser = 0 } = data;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return {
        success: false,
        status: 400,
        message: "No valid user IDs provided.",
      };
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $inc: { commissionEarned: amountPerUser } }
    );

    return {
      success: true,
      status: 200,
      message: `Successfully updated ${result.modifiedCount} user(s) with commission.`,
      data: result,
    };
  } catch (error) {
    console.error("Allocate Commission Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const registerUserFromPanel = async (data) => {
  try {
    const {
      userType,
      name,
      email,
      contact,
      password,
      stayDetails,
      messDetails,
      personalDetails,
    } = data;
    console.log(data);
    let rentType;

    if (userType === "dailyRent") {
      rentType = "daily";
    } else if (userType === "messOnly") {
      rentType = "mess";
    }

    // 1. Required field validation
    const validationError = validateRequiredFields(
      userType,
      rentType,
      name,
      contact,
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
      password ? bcrypt.hash(password, 10) : Promise.resolve(null),
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
      isApproved: true,
      isHeavens: true,
      personalDetails,
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
    if (userType === "dailyRent") {
      await assignRoomToUser({
        userId: newUser._id,
        roomId: stayDetails.roomId,
        userType: "dailyRenter",
      });
    }
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
        message: "Registration successful",
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
