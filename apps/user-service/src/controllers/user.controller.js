import mongoose from "mongoose";
import User from "../models/user.model.js";
import emailService from "../services/email/email.service.js";
import { getAccessibleKitchens } from "../services/inventory.service.js";
import {
  assignRoomToUser,
  removeFromRoom,
} from "../services/property.service.js";
import { handleReferralOnApproval } from "../services/referral.service.js";
import {
  cleanUpdateData,
  getCompletedFields,
  processAdminUpdates,
  updateUserFields,
  validateAdminUpdates,
  validateUserUpdate,
} from "../services/userUpdate.service.js";
import { getNextResidentId } from "../utils/getNextResidentId.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";
import {
  validateFieldFormats,
  validateRequiredFields,
  checkExistingUsers,
  calculateNextDueDate,
} from "../utils/validators.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dayjs from "dayjs";
import {
  createServiceHistoryEntry,
  calculateEndDate,
  shouldArchiveCurrentStay,
} from "../utils/rejoinUser.utils.js";
import {
  getUserByEmail,
  registerUser,
  vacateUserById,
} from "../services/user.service.js";
import {
  deleteFromFirebase,
  uploadToFirebase,
} from "../utils/imageOperation.js";
// import UserLog from "../models/userLog.modal.js";
import {
  renderVerificationError,
  renderVerificationServerError,
  renderVerificationSuccess,
} from "../services/email/verificationTemplate.service.js";
import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";

createResponder(USER_PATTERN.USER.GET_USER_BY_EMAIL, async (data) => {
  console.log(data);
  return await getUserByEmail(data?.email);
});

createResponder(USER_PATTERN.USER.REGISTER_USER, async (data) => {
  console.log(data);
  return await registerUser(data);
});

// export const registerUser = async (req, res) => {
//   try {
//     const {
//       userType,
//       name,
//       email,
//       contact,
//       password,
//       stayDetails,
//       messDetails,
//       referralLink,
//       isHeavens,
//       personalDetails,
//     } = req.body;

//     let rentType;
//     if (userType === "student" || userType === "worker") {
//       rentType = "monthly";
//     } else if (userType === "dailyRent") {
//       rentType = "daily";
//     } else if (userType === "messOnly") {
//       rentType = "mess";
//     }
//     const validationError = validateRequiredFields(
//       userType,
//       rentType,
//       name,
//       email,
//       contact,
//       password,
//       stayDetails,
//       messDetails
//     );
//     if (validationError) {
//       return res.status(400).json(validationError);
//     }

//     // 2. Validate field formats
//     const formatErrors = validateFieldFormats(email, password, contact);
//     if (formatErrors.length > 0) {
//       return res.status(400).json({
//         status: "error",
//         message: "Validation errors",
//         errors: formatErrors,
//       });
//     }

//     // 3. Check for existing users (email/contact)
//     const existingUserChecks = await checkExistingUsers(email, contact);
//     if (existingUserChecks.error) {
//       return res.status(400).json(existingUserChecks);
//     }

//     // 4. Generate necessary IDs and hash password
//     const [residentId, hashedPassword] = await Promise.all([
//       getNextResidentId(),
//       bcrypt.hash(password, 10),
//     ]);

//     // 5. Prepare base user object
//     const userData = {
//       name,
//       residentId,
//       email,
//       contact,
//       password: hashedPassword,
//       userType,
//       rentType,
//       isVerified: false,
//       isHeavens: isHeavens || false,
//       personalDetails,
//       referralInfo: { referredByLink: referralLink || null },
//     };

//     // 6. Add type-specific data
//     if (userType === "messOnly") {
//       userData.messDetails = {
//         ...messDetails,
//         messStartDate: new Date(messDetails.messStartDate),
//         messEndDate: new Date(messDetails.messEndDate),
//       };

//       // Calculate number of days for MessOnly
//       //   const messDays =
//       //     Math.ceil(
//       //       (new Date(messDetails.messEndDate) -
//       //         new Date(messDetails.messStartDate)) /
//       //         (1000 * 60 * 60 * 24)
//       //     ) + 1; // Include both start and end dates

//       userData.financialDetails = {
//         totalAmount: messDetails.rent * messDetails.noOfDays,
//         pendingAmount: messDetails.rent * messDetails.noOfDays,
//         accountBalance: 0,
//       };
//     } else if (rentType === "monthly") {
//       // For Monthly Residents (Students/Workers)
//       userData.residentId = residentId;
//       userData.stayDetails = {
//         ...stayDetails,
//         joinDate: stayDetails.joinDate
//           ? new Date(stayDetails.joinDate)
//           : new Date(),
//       };
//       userData.financialDetails = {
//         monthlyRent: stayDetails.monthlyRent,
//         pendingRent: stayDetails.monthlyRent,
//         accountBalance: 0,
//         nextDueDate: new Date(stayDetails.joinDate) || new Date(),
//         paymentDueSince: new Date(stayDetails.joinDate) || new Date(),
//       };
//     } else if (rentType === "daily") {
//       // For Daily Renters
//       userData.residentId = residentId;
//       userData.stayDetails = {
//         ...stayDetails,
//         checkInDate: stayDetails.checkInDate
//           ? new Date(stayDetails.checkInDate)
//           : new Date(),
//         checkOutDate: stayDetails.checkOutDate
//           ? new Date(stayDetails.checkOutDate)
//           : new Date(),
//       };

//       // Calculate number of days for DailyRent
//       //   const dailyDays =
//       //     stayDetails.noOfDays ||
//       //     Math.ceil(
//       //       (new Date(stayDetails.checkOutDate) -
//       //         new Date(stayDetails.checkInDate)) /
//       //         (1000 * 60 * 60 * 24)
//       //     ) + 1; // Include both check-in and check-out dates

//       userData.financialDetails = {
//         totalAmount: stayDetails.dailyRent * stayDetails.noOfDays,
//         pendingAmount: stayDetails.dailyRent * stayDetails.noOfDays,
//         accountBalance: 0,
//       };
//     }

//     // 7. Create and save user
//     const newUser = new User(userData);
//     await newUser.save();

//     try {
//       await UserLog.create({
//         userId: newUser._id,
//         action: "create",
//         changedByName: "resident",
//         message: `New ${newUser.userType} (${newUser.name}) registered for ${
//           newUser.stayDetails.propertyName ||
//           newUser.messDetails.kitchenName ||
//           "UnKnown Property"
//         } with ${rentType} rent type`,
//         propertyId: newUser.stayDetails?.propertyId || null,
//         kitchenId: newUser.stayDetails?.kitchenId || null,
//         timestamp: new Date(),
//       });
//     } catch (logError) {
//       console.error("Failed to save registration log:", logError);
//     }

//     // 8. Prepare response
//     const responseData = {
//       userId: newUser._id,
//       name: newUser.name,
//       email: newUser.email,
//       userType: newUser.userType,
//       rentType: newUser.rentType,
//     };

//     if (userType !== "messOnly") {
//       responseData.residentId = newUser.residentId;
//       responseData.roomNumber = newUser.stayDetails?.roomNumber;
//     } else {
//       responseData.kitchenName = newUser.messDetails?.kitchenName;
//     }

//     return res.status(201).json({
//       status: "success",
//       message: "Registration successful. Awaiting approval.",
//       data: responseData,
//     });
//   } catch (err) {
//     console.error("Registration Error:", err);

//     let errorMessage = "Registration failed";
//     let statusCode = 500;

//     if (err.name === "ValidationError") {
//       errorMessage = "Invalid user data";
//       statusCode = 400;
//     } else if (err.code === 11000) {
//       errorMessage = "Duplicate key error";
//       statusCode = 400;
//       if (err.keyPattern.email) {
//         errorMessage = "Email already registered";
//       } else if (err.keyPattern.contact) {
//         errorMessage = "Contact number already registered";
//       } else if (err.keyPattern.residentId) {
//         errorMessage = "Resident ID generation error";
//       }
//     }

//     return res.status(statusCode).json({
//       status: "error",
//       message: errorMessage,
//       details: process.env.NODE_ENV === "development" ? err.message : undefined,
//     });
//   }
// };

export const getUnapprovedUsers = async (req, res) => {
  try {
    const { propertyId } = req.query;
    // console.log(propertyId);
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

    res.status(200).json({
      message: "Fetched unapproved residents successfully",
      data: formattedResidents,
    });
  } catch (error) {
    console.error("Error fetching residents:", error);
    res.status(500).json({
      message: "Server error while fetching residents",
      error: error.message,
    });
  }
};

export const approveUser = async (req, res) => {
  const { id } = req.params;
  const {
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
  } = req.body;

  try {
    const user = await User.findById(id).lean();
    // console.log(user);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isApproved) {
      return res.status(400).json({ error: "User already approved" });
    }

    // Common updates for all user types
    const updates = {
      ...(name && { name }),
      ...(email && { email }),
      ...(contact && { contact }),
      ...(userType && { userType }),
      ...(rentType && { rentType }),
      isApproved: true,
      updatedAt: new Date(),
      profileCompletion: calculateProfileCompletion(user),
    };

    // Type-specific updates
    if (user.userType === "messOnly") {
      // Validate required fields for MessOnly
      if (!kitchenId) {
        return res.status(400).json({
          error: "Kitchen ID is required for MessOnly users",
        });
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
        return res
          .status(400)
          .json({ error: "Room ID is required for approval" });
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
          sharingType: roomAssignment.room.sharingType,
          roomNumber: roomAssignment.room.roomNo,
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
          sharingType: roomAssignment.room.sharingType,
          roomNumber: roomAssignment.room.roomNo,
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

    return res.status(200).json({
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
    });
  } catch (error) {
    console.error("Approval error:", error);
    const status = error.status || 500;
    const message = error.message || "Server error during approval";
    return res.status(status).json({ error: message });
  }
};

export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.query;
    console.log(updatedBy);
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required",
      });
    }

    // Find the user before deleting (to log details)
    const userToDelete = await User.findById(id).lean();

    if (!userToDelete) {
      return res.status(404).json({
        status: "error",
        message: "User not found or already removed",
      });
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

    return res.status(200).json({
      status: "success",
      message: "User onboarding request rejected successfully",
    });
  } catch (err) {
    console.error("Reject User Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to reject user request",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// export const verifyEmail = async (req, res) => {
//   const {token, email} = req.query;

//   try {
//     const user = await User.findOne({
//       email,
//       emailVerificationToken: token,
//       emailVerificationExpires: {$gt: Date.now()},
//     });

//     if (!user) {
//       return res.status(400).json({
//         error: "Invalid token or token expired",
//       });
//     }

//     // Mark email as verified and enable login
//     user.isVerified = true;
//     user.isLoginEnabled = true;
//     user.emailVerificationToken = undefined;
//     user.emailVerificationExpires = undefined;
//     await user.save();

//     return res.status(200).json({
//       message: "Email verified successfully. You can now login.",
//     });
//   } catch (error) {
//     console.error("Verification error:", error);
//     return res.status(500).json({error: "Server error during verification"});
//   }
// };

export const verifyEmail = async (req, res) => {
  const { token, email } = req.query;

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
      return res.status(400).send(html);
    }

    // Mark email as verified and enable login
    user.isVerified = true;
    user.isLoginEnabled = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const html = await renderVerificationSuccess();
    return res.status(200).send(html);
  } catch (error) {
    console.error("Verification error:", error);
    const html = await renderVerificationServerError();
    return res.status(500).send(html);
  }
};

export const updateProfileCompletion = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  // console.log(updateData);

  const files = req.files;
  // console.log("Files", files);

  let photoUrl = null;
  let aadharFrontUrl = null;
  let aadharBackUrl = null;

  if (files) {
    if (files.profileImg && files.profileImg[0]) {
      console.log("Uploading photo...");
      photoUrl = await uploadToFirebase(files.profileImg[0], "user-photos");
      console.log("Photo uploaded to:", photoUrl);
    }
    if (files.aadharFront && files.aadharFront[0]) {
      console.log("Uploading Aadhar front image...");
      aadharFrontUrl = await uploadToFirebase(
        files.aadharFront[0],
        "user-documents"
      );
      console.log("Aadhar front image uploaded to:", aadharFrontUrl);
    }
    if (files.aadharBack && files.aadharBack[0]) {
      console.log("Uploading Aadhar back image...");
      aadharBackUrl = await uploadToFirebase(
        files.aadharBack[0],
        "user-documents"
      );
      console.log("Aadhar back image uploaded to:", aadharBackUrl);
    }
  }

  if (!updateData.personalDetails) {
    updateData.personalDetails = {};
  }

  if (photoUrl) {
    updateData.personalDetails.profileImg = photoUrl;
  }
  if (aadharFrontUrl) {
    updateData.personalDetails.aadharFront = aadharFrontUrl;
  }
  if (aadharBackUrl) {
    updateData.personalDetails.aadharBack = aadharBackUrl;
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await validateUserUpdate(user, updateData);
    updateUserFields(user, updateData);
    await user.save();

    return res.status(200).json({
      message:
        user.profileCompletion === 100
          ? "Profile fully completed. You are at 100%."
          : `Profile updated successfully. ${
              100 - user.profileCompletion
            }% remaining.`,
      profileCompletion: user.profileCompletion,
      userType: user.userType,
      completedFields: getCompletedFields(user),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    const status =
      error.message.includes("Invalid") ||
      error.message.includes("Missing") ||
      error.message.includes("already")
        ? 400
        : 500;
    return res.status(status).json({
      error:
        status === 400 ? error.message : "Server error during profile update",
    });
  }
};

function rebuildNestedFields(flatObject) {
  const result = {};

  for (let key in flatObject) {
    if (key.includes(".")) {
      const keys = key.split(".");
      keys.reduce((acc, k, idx) => {
        if (idx === keys.length - 1) {
          acc[k] = flatObject[key];
        } else {
          acc[k] = acc[k] || {};
        }
        return acc[k];
      }, result);
    } else {
      result[key] = flatObject[key];
    }
  }

  return result;
}

export const adminUpdateUser = async (req, res) => {
  const { id } = req.params;

  const files = req.files;
  const flat = req.body;
  const updateData = rebuildNestedFields(flat);

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const personal = updateData.personalDetails || {};

    const originalProfileImg = user.personalDetails?.profileImg;
    const originalAadharFront = user.personalDetails?.aadharFront;
    const originalAadharBack = user.personalDetails?.aadharBack;

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

    // ✅ Update the user object with new personal details
    updateData.personalDetails = personal;

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

    return res.status(200).json({
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
    });
  } catch (error) {
    console.error("Admin user update error:", error);
    const status =
      error.status ||
      error.message.includes("already") ||
      error.message.includes("cannot") ||
      error.message.includes("Invalid")
        ? 400
        : 500;
    return res.status(status).json({
      success: false,
      error: status === 400 ? error.message : "Server error during user update",
    });
  }
};

export const getHeavensUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId).lean();
    // console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUsersByRentType = async (req, res) => {
  try {
    const {
      rentType,
      propertyId,
      page = 1,
      limit = 10,
      search,
      status,
      joinDate,
    } = req.query;

    // Convert and validate pagination parameters
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Validate pagination
    if (
      isNaN(pageNumber) ||
      pageNumber < 1 ||
      isNaN(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
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
        const accessibleKitchens = await getAccessibleKitchens(propertyId);
        const kitchenIds = accessibleKitchens.map((k) => k._id.toString());
        queryConditions["messDetails.kitchenId"] = { $in: kitchenIds };
      } else {
        queryConditions["stayDetails.propertyId"] = propertyId;
      }
    }

    // Search functionality - enhanced
    if (search) {
      const searchRegex = new RegExp(search, "i"); // Case-insensitive
      queryConditions.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contact: searchRegex },
        { "stayDetails.roomNumber": searchRegex },
        { "stayDetails.propertyName": searchRegex },
      ];
    }

    // Status filter - fixed mapping
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

    // Date filter - more robust handling
    if (joinDate) {
      try {
        const startDate = new Date(`${joinDate}T00:00:00.000Z`);
        const endDate = new Date(`${joinDate}T23:59:59.999Z`);

        queryConditions.$or = [
          { createdAt: { $gte: startDate, $lte: endDate } },
          { "stayDetails.joinDate": { $gte: startDate, $lte: endDate } },
        ];

        console.log("Date filter range:", {
          createdAt: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
          joinDate: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
        });
      } catch (err) {
        console.error("Error parsing joinDate:", joinDate, err);
      }
    }

    // Projection to reduce data transfer
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
      "financialDetails.totalAmount": 1,
      "financialDetails.pendingAmount": 1,
      "financialDetails.fines": 1,
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

    // Get total count for pagination metadata
    const totalCount = await User.countDocuments(queryConditions);
    const skip = (pageNumber - 1) * limitNumber;
    // console.log(queryConditions);

    // Fetch users
    const users = await User.find(queryConditions)
      .select(projection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    console.log(users);
    // Format response
    const formattedUsers = users.map((user) => {
      const fines = user.financialDetails?.fines || [];

      const outstandingFines = fines
        .filter((fine) => !fine.paid)
        .reduce((sum, fine) => sum + (fine.amount || 0), 0);

      return {
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
        totalAmount: user.financialDetails?.totalAmount,
        pendingAmount: user.financialDetails?.pendingAmount,
        roomNumber: user.stayDetails?.roomNumber,
        propertyName: user.stayDetails?.propertyName,
        sharingType: user.stayDetails?.sharingType,
        rent: user.stayDetails?.dailyRent || user.messDetails?.rent,
        monthlyRent: user.financialDetails?.monthlyRent,
        pendingRent: user.financialDetails?.pendingRent,
        nextDueDate: user.financialDetails?.nextDueDate,
        fines: fines,
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

    console.log(formattedUsers);

    res.status(200).json({
      success: true,
      pagination: {
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNumber),
        currentPage: pageNumber,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < Math.ceil(totalCount / limitNumber),
        hasPreviousPage: pageNumber > 1,
      },
      data: formattedUsers,
    });
  } catch (error) {
    console.error("Error fetching users by rentType:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching users",
    });
  }
};

export const getCheckOutedUsersByRentType = async (req, res) => {
  try {
    const { rentType, propertyId, page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Validate rentType (if provided)
    const validRentTypes = ["monthly", "daily", "mess"];
    if (rentType && !validRentTypes.includes(rentType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid rentType. Must be monthly, daily, or mess",
      });
    }

    // Validate pagination parameters
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid page number. Must be a positive integer",
      });
    }

    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        success: false,
        error: "Invalid limit. Must be between 1 and 100",
      });
    }

    // Base query conditions
    const queryConditions = {
      isApproved: true,
      isVacated: true,
    };

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
        fines: fines,
        outstandingFines,
        joinedDate: user.createdAt,
        vacatedAt: user.vacatedAt,
        statusRequests: user.statusRequests,
      };
    });

    res.status(200).json({
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
    });
  } catch (error) {
    console.error("Error fetching users by rentType:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching users",
    });
  }
};

export const vacateUser = async (req, res) => {
  try {
    const { adminName } = req.query;
    const result = await vacateUserById(req.params.id);
    console.log(result);
    try {
      await UserLog.create({
        userId: req.params.id,
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

    res.status(200).json({
      message: "Resident vacated successfully",
      data: result,
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || "Error vacating resident",
    });
  }
};

export const rejoinUser = async (req, res) => {
  try {
    const { id } = req.params;
    // const {adminName} = req.query;

    const {
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
      nonRefundableDeposit,
      refundableDeposit,

      // Type-specific dates
      joinDate,
      messDetails,
      noOfDays,
      updatedBy,
    } = req.body;
    console.log(req.body);

    const user = await User.findById(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
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
      // console.log("roommmmmmm");
      // console.log(roomAssignment);
      // console.log("roommmmmmm");
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
        sharingType: roomAssignment.room.sharingType,
        roomNumber: roomAssignment.room.roomNo,
        roomId,
        rent,
        nonRefundableDeposit,
        refundableDeposit,
        ...(rentType === "monthly" && {
          monthlyRent: rent,
          joinDate: joinDate ? new Date(joinDate) : new Date(),
        }),
        ...(rentType === "daily" && {
          dailyRent: rent,
          checkInDate: serviceStartDate
            ? new Date(serviceStartDate)
            : new Date(),
          checkOutDate: serviceEndDate
            ? new Date(serviceEndDate)
            : calculateEndDate(serviceStartDate, noOfDays),
          noOfDays: noOfDays || 1,
        }),
      };

      if (rentType === "monthly") {
        user.financialDetails = {
          monthlyRent: rent,
          pendingRent: rent,
          accountBalance: 0,
          nextDueDate: joinDate ? new Date(joinDate) : new Date(),
          paymentDueSince: joinDate ? new Date(joinDate) : new Date(),
          // ...(user.financialDetails || {}),
        };
      } else if (rentType === "daily") {
        user.financialDetails = {
          totalAmount: rent * (noOfDays || 1),
          pendingAmount: rent * (noOfDays || 1),
          accountBalance: 0,
          // ...(user.financialDetails || {}),
        };
      }
    }

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

    res.status(200).json({
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
    });
  } catch (error) {
    console.error("Error rejoining user:", error);
    res.status(500).json({
      success: false,
      message: "Server error during rejoin",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getUserIds = async (req, res) => {
  try {
    const { messOnly, studentOnly, dailyRentOnly, workerOnly } = req.query;

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

    return res.status(200).json(userIds);
  } catch (err) {
    console.error("Error fetching user IDs:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getHeavensResidentsForNotification = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const query = { isHeavens: true };
    if (propertyId) query.propertyId = propertyId;

    const users = await User.find(query).select("_id").lean();

    const userIds = users.map((user) => user._id);

    res.status(200).json(userIds);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getTodayCheckouts = async (req, res) => {
  try {
    const { type, propertyId } = req.query;
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
          .map((u) => u.messDetails?.kitchenId)
          .filter(Boolean);

        if (kitchenIds.length > 0) {
          const accessibleKitchens = await getAccessibleKitchens(propertyId);
          const accessibleKitchenIds = accessibleKitchens.map((k) =>
            k._id.toString()
          );
          filteredUsers = users.filter((u) =>
            accessibleKitchenIds.includes(u.messDetails?.kitchenId?.toString())
          );
        } else {
          filteredUsers = [];
        }
      }

      return filteredUsers.map((user) => {
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
      return res.status(400).json({
        success: false,
        error: "Invalid 'type' parameter. Use 'dailyRent' or 'messOnly'.",
      });
    }

    res.status(200).json({
      success: true,
      count: dailyRentData.length + messOnlyData.length,
      data: {
        dailyRent: dailyRentData,
        messOnly: messOnlyData,
      },
    });
  } catch (error) {
    console.error("Error fetching checkouts:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching checkouts",
      details: error.message,
    });
  }
};

export const extendUserDays = async (req, res) => {
  try {
    const { id } = req.params;
    const { extendDate, additionalDays, newRentAmount, adminName } = req.body;

    // Validate input
    if (!additionalDays || additionalDays < 1) {
      return res.status(400).json({
        success: false,
        error: "Additional days must be at least 1",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
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
      return res.status(400).json({
        success: false,
        error: "Stay extension only available for DailyRent and MessOnly users",
      });
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

    res.status(200).json({
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
    });
  } catch (error) {
    console.error("Error extending stay:", error);
    res.status(500).json({
      success: false,
      error: "Server error during stay extension",
    });
  }
};

export const createStatusRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, reason } = req.body;

    // Validate request type
    const allowedTypes = ["checked_in", "on_leave", "checked_out"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid request type" });
    }

    // Always fetch current request status
    const user = await User.findById(id).select(
      "paymentStatus stayDetails.depositStatus currentStatusRequest"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if there's already a pending request for any type
    if (user.currentStatusRequest?.status === "pending") {
      return res.status(400).json({
        error:
          "You already have a pending request. Please wait for it to be processed.",
      });
    }

    // Additional validation for checkout requests
    if (type === "checked_out") {
      if (
        user.paymentStatus === "pending" ||
        user.stayDetails?.depositStatus === "pending"
      ) {
        return res.status(400).json({
          error: "Cannot request checkout while payment or deposit is pending",
        });
      }
    }

    // Create the new request
    const newRequest = {
      type,
      reason: reason || "",
      status: "pending",
      requestedAt: new Date(),
    };

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $push: { statusRequests: newRequest },
        $set: { currentStatusRequest: newRequest },
      },
      { new: true }
    );

    res.status(201).json({
      message: "Request submitted successfully",
      request:
        updatedUser.statusRequests[updatedUser.statusRequests.length - 1],
    });
  } catch (error) {
    console.error("Error creating status request:", error);
    res.status(500).json({ error: "Error submitting request" });
  }
};

export const getPendingStatusRequests = async (req, res) => {
  try {
    const {
      propertyId,
      type,
      userType,
      sortBy = "requestedAt",
      sortOrder = "asc",
    } = req.query;

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
          [`statusRequests.${sortBy}`]: sortOrder === "asc" ? 1 : -1,
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
          request: "$statusRequests",
        },
      },
    ];

    const results = await User.aggregate(aggregation);

    res.status(200).json({
      success: true,
      total: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching requests",
    });
  }
};

export const respondToStatusRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { status, comment, adminName } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = user.statusRequests.find((r) => r._id.equals(requestId));
    if (!request) {
      return res.status(404).json({ error: "Status request not found" });
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
          user.isBlocked = false;
          break;
        case "on_leave":
          user.currentStatus = "on_leave";
          user.isBlocked = true;
          break;
      }
    }

    await user.save();
    res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      data: {
        userId: user._id,
        requestType,
        newStatus: user.currentStatus,
        currentStatusRequest: user.currentStatusRequest,
      },
    });
  } catch (error) {
    console.error("Error responding to request:", error);
    res.status(500).json({
      success: false,
      error: "Error processing request",
    });
  }
};

export const getUserStatusRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status } = req.query;

    const user = await User.findById(id).select("statusRequests");

    if (!user) return res.status(404).json({ error: "User not found" });

    let requests = user.statusRequests;

    if (type) {
      requests = requests.filter((req) => req.type === type);
    }
    if (status) {
      requests = requests.filter((req) => req.status === status);
    }

    requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    res.json({
      total: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching requests" });
  }
};

export const handleBlockStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, extendDate, adminName } = req.body; // Changed from extendDays to extendDate
    console.log(req.body);
    // Validate input
    if (action === "unblock" && !extendDate) {
      return res.status(400).json({
        success: false,
        error: "extendDate is required when unblocking",
      });
    }

    // Validate date is in the future if provided
    if (extendDate && new Date(extendDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: "extendDate must be in the future",
      });
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
      return res.status(400).json({
        success: false,
        error: "Invalid action. Use 'block' or 'unblock'",
      });
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
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

    res.status(200).json({
      success: true,
      message,
      data: {
        isBlocked: user.isBlocked,
        isAccessBlockExtendDate: user.isAccessBlockExtendDate,
      },
    });
  } catch (error) {
    console.error("Error handling block status:", error);
    res.status(500).json({
      success: false,
      error: "Server error while updating block status",
    });
  }
};

// createResponder("get-user", async (data) => {
//   const { userId } = data;
//   console.log(`[Responder] Fulfilling request for userId: ${userId}`);
//   const user = await User.findById(userId);
//   return user; // The return value will be sent back automatically
// });
