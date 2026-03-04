import User from "../models/user.model.js";
import {calculateProfileCompletion} from "../utils/profileCompletion.js";
import {validateContact, validateEmail} from "../utils/validators.js";
import {assignRoomToUser, updatePropertyCounts} from "./internal.service.js";

export const validateUserUpdate = async (user, updateData) => {
  const {userType, contact: currentContact, email: currentEmail} = user;

  const REQUIRED_SECTIONS = {
    Student: ["personalDetails", "parentsDetails", "studyDetails"],
    Worker: ["personalDetails", "workingDetails"],
    DailyRent: ["personalDetails"],
    MessOnly: ["personalDetails"],
  };

  const requiredSections = REQUIRED_SECTIONS[userType] || [];
  const missingSections = requiredSections.filter(
    (section) => !updateData[section],
  );

  if (missingSections.length > 0) {
    throw new Error(
      `Missing required sections for ${userType}: ${missingSections.join(", ")}`,
    );
  }

  // Student-specific validations
  if (userType === "student" && updateData.parentsDetails) {
    const {email, contact} = updateData.parentsDetails;

    if (email && !validateEmail(email)) {
      throw new Error("Invalid parent email format");
    }

    if (contact) {
      if (!validateContact(contact)) {
        throw new Error("Parent contact must be 10 digits starting with 6-9");
      }

      if (contact === (updateData.contact || currentContact)) {
        throw new Error("Parent's contact cannot match student contact");
      }

      const existingUser = await User.findOne({
        contact,
        _id: {$ne: user._id},
      });

      if (existingUser) {
        throw new Error("Parent's contact is already registered");
      }
    }
  }

  // 🧩 Email uniqueness check for user
  if (updateData.email && updateData.email !== currentEmail) {
    const existingUser = await User.findOne({
      email: updateData.email,
      _id: {$ne: user._id},
    });
    if (existingUser) {
      throw new Error("Email is already registered");
    }
  }

  // 🧩 Contact uniqueness check for user
  if (updateData.contact && updateData.contact !== currentContact) {
    const existingUser = await User.findOne({
      contact: updateData.contact,
      _id: {$ne: user._id},
    });
    if (existingUser) {
      throw new Error("Contact number is already registered");
    }
  }

  // 🧩 Coliving partner validations
  if (updateData.colivingPartner) {
    const partner = updateData.colivingPartner;

    if (partner.email) {
      const existingPartnerEmail = await User.findOne({
        email: partner.email,
        _id: {$ne: user._id},
      });
      if (existingPartnerEmail) {
        throw new Error("Coliving partner's email is already registered");
      }
    }

    if (partner.contact) {
      const existingPartnerContact = await User.findOne({
        contact: partner.contact,
        _id: {$ne: user._id},
      });
      if (existingPartnerContact) {
        throw new Error("Coliving partner's contact is already registered");
      }
    }
  }
};

export const updateUserFields = (user, updateData) => {
  const CORE_FIELDS = ["name", "email", "contact"];
  const PROFILE_SECTIONS = [
    "personalDetails",
    "parentsDetails",
    "studyDetails",
    "workingDetails",
  ];

  // ✅ Update core fields with validation
  CORE_FIELDS.forEach((field) => {
    if (updateData[field] !== undefined && updateData[field] !== user[field]) {
      if (field === "email" && !validateEmail(updateData[field])) {
        throw new Error("Invalid email format");
      }

      if (field === "contact" && !validateContact(updateData[field])) {
        throw new Error("Contact must be 10 digits starting with 6-9");
      }

      user[field] = updateData[field];
    }
  });

  // ✅ Update profile sections
  PROFILE_SECTIONS.forEach((section) => {
    if (updateData[section]) {
      user[section] = {
        ...user[section],
        ...updateData[section],
      };
    }
  });

  // ✅ Handle coliving partner (new)
  if (updateData.colivingPartner) {
    const partnerData = updateData.colivingPartner;
    user.colivingPartner = {
      ...user.colivingPartner,
      ...partnerData,
    };

    if (partnerData.email && !validateEmail(partnerData.email)) {
      throw new Error("Invalid coliving partner email format");
    }

    if (partnerData.contact && !validateContact(partnerData.contact)) {
      throw new Error(
        "Coliving partner contact must be 10 digits starting with 6-9",
      );
    }
  }

  // ✅ Recalculate profile completion
  user.profileCompletion = calculateProfileCompletion(user);
  user.updatedAt = new Date();
};

export const getCompletedFields = (user) => {
  const fields = {
    core: ["name", "email", "contact"],
    personalDetails: [
      "address",
      "dob",
      "gender",
      "profileImg",
      "aadharFront",
      "aadharBack",
    ],
    parentsDetails:
      user.userType === "student"
        ? ["name", "email", "contact", "occupation"]
        : [],
    studyDetails:
      user.userType === "student"
        ? ["course", "yearOfStudy", "institution"]
        : [],
    workingDetails:
      user.userType === "worker"
        ? ["jobTitle", "companyName", "location", "emergencyContact"]
        : [],
    // ✅ New: coliving partner fields
    colivingPartner: ["name", "email", "contact", "aadharFront", "aadharBack"],
  };

  const completed = {};

  // ✅ Core user fields
  completed.core = fields.core.filter((f) => !!user[f]).length;

  // ✅ Personal details
  completed.personalDetails = fields.personalDetails.filter(
    (f) => !!user.personalDetails?.[f],
  ).length;

  // ✅ Parents details (students only)
  if (user.userType === "student") {
    completed.parentsDetails = fields.parentsDetails.filter(
      (f) => !!user.parentsDetails?.[f],
    ).length;
  }

  // ✅ Study details (students only)
  if (user.userType === "student") {
    completed.studyDetails = fields.studyDetails.filter(
      (f) => !!user.studyDetails?.[f],
    ).length;
  }

  // ✅ Working details (workers only)
  if (user.userType === "worker") {
    completed.workingDetails = fields.workingDetails.filter(
      (f) => !!user.workingDetails?.[f],
    ).length;
  }

  // ✅ Coliving partner (only if applicable)
  if (user.isColiving && user.colivingPartner) {
    completed.colivingPartner = fields.colivingPartner.filter(
      (f) => !!user.colivingPartner?.[f],
    ).length;
  }

  return completed;
};

// For admin update user data
export const cleanUpdateData = (data) => {
  if (typeof data !== "object" || data === null) return data;

  return Object.fromEntries(
    Object.entries(data)
      .filter(([_, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => [k, typeof v === "object" ? cleanUpdateData(v) : v]),
  );
};

export const validateAdminUpdates = async (user, cleanedData) => {
  // console.log(cleanedData); // Validate contact uniqueness
  if (cleanedData.contact && cleanedData.contact !== user.contact) {
    const existingUser = await User.findOne({
      contact: cleanedData.contact,
      _id: {$ne: user._id},
    });
    if (existingUser) {
      throw new Error("Contact number already in use by another user");
    }
  }

  // Validate email uniqueness
  if (cleanedData.email && cleanedData.email !== user.email) {
    const existingUser = await User.findOne({
      email: cleanedData.email,
      _id: {$ne: user._id},
    });
    if (existingUser) {
      throw new Error("Email already in use by another user");
    }
  }

  // Student-specific validations
  if (user.userType === "student" && cleanedData.parentsDetails?.contact) {
    const parentContact = cleanedData.parentsDetails.contact;
    const studentContact = cleanedData.contact || user.contact;

    if (parentContact === studentContact) {
      throw new Error("Parent's contact cannot be same as student's contact");
    }

    const existingUser = await User.findOne({
      contact: parentContact,
      _id: {$ne: user._id},
    });
    if (existingUser) {
      throw new Error(
        "Parent's contact is already registered as a user contact",
      );
    }
  }
};

export const rebuildNestedFields = async (flatObject) => {
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
};

// Resolve the promise if updateData is async
export const processAdminUpdates = async (user, updateData) => {
  const resolvedUpdateData = await updateData;
  console.log(resolvedUpdateData);
  // Handle room reassignment for non-mess-only users
  if (user.userType !== "messOnly" && resolvedUpdateData.stayDetails?.roomId) {
    await handleRoomChange(
      user,
      resolvedUpdateData.stayDetails.roomId,
      resolvedUpdateData.stayDetails.propertyId,
    );
  }

  // Handle kitchen reassignment for mess-only users
  if (
    user.userType === "messOnly" &&
    resolvedUpdateData.messDetails?.kitchenId
  ) {
    await handleKitchenChange(
      user,
      resolvedUpdateData.messDetails.kitchenId,
      resolvedUpdateData.messDetails.kitchenName,
    );
  }

  // CORE fields directly update
  const ADMIN_FIELDS = [
    "name",
    "email",
    "contact",
    "userType",
    "rentType",
    "isHeavens",
    "isApproved",
    "isVerified",
    "isBlocked",
    "financialDetails",
    "currentStatus",
    "paymentStatus",
  ];

  ADMIN_FIELDS.forEach((field) => {
    if (field in resolvedUpdateData) {
      user[field] =
        resolvedUpdateData[field] !== undefined
          ? resolvedUpdateData[field]
          : user[field];
    }
  });

  // STAY / MESS DETAILS
  if (user.userType !== "messOnly") {
    if (resolvedUpdateData.stayDetails) {
      user.stayDetails = {
        ...user.stayDetails,
        ...resolvedUpdateData.stayDetails,
        ...(resolvedUpdateData.stayDetails.joinDate && {
          joinDate: new Date(resolvedUpdateData.stayDetails.joinDate),
        }),
        ...(resolvedUpdateData.stayDetails.checkInDate && {
          checkInDate: new Date(resolvedUpdateData.stayDetails.checkInDate),
        }),
        ...(resolvedUpdateData.stayDetails.checkOutDate && {
          checkOutDate: new Date(resolvedUpdateData.stayDetails.checkOutDate),
        }),
      };
    }
  } else {
    if (resolvedUpdateData.messDetails) {
      // 🔥 FIX mealType casting issue
      if (resolvedUpdateData.messDetails.mealType) {
        const mealType = resolvedUpdateData.messDetails.mealType;

        if (!Array.isArray(mealType) && typeof mealType === "object") {
          resolvedUpdateData.messDetails.mealType = Object.values(mealType);
        }
      }

      user.messDetails = {
        ...user.messDetails,
        ...resolvedUpdateData.messDetails,
        ...(resolvedUpdateData.messDetails.messStartDate && {
          messStartDate: new Date(resolvedUpdateData.messDetails.messStartDate),
        }),
        ...(resolvedUpdateData.messDetails.messEndDate && {
          messEndDate: new Date(resolvedUpdateData.messDetails.messEndDate),
        }),
      };
    }
  }

  // NESTED SECTIONS INCLUDING PARTNER
  const NESTED_SECTIONS = [
    "personalDetails",
    "parentsDetails",
    "studyDetails",
    "workingDetails",
    "referralInfo",
    "colivingPartner", // ✅ added partner section
  ];

  NESTED_SECTIONS.forEach((section) => {
    if (section in resolvedUpdateData) {
      user[section] = {
        ...user[section], // keep existing
        ...resolvedUpdateData[section], // overwrite with new
      };
    }
  });

  // Recalculate profile completion
  user.profileCompletion = calculateProfileCompletion(user);
  user.updatedAt = new Date();
};

// Helper function to handle kitchen changes for MessOnly users
async function handleKitchenChange(user, newKitchenId, newKitchenName) {
  user.messDetails.kitchenId = newKitchenId;
  user.messDetails.kitchenName = newKitchenName;
}

export const handleRoomChange = async (user, newRoomId, newPropertyId) => {
  try {
    const currentRoomId = user.stayDetails?.roomId;
    const currentPropertyId = user.stayDetails?.propertyId;

    // If room is being changed
    if (newRoomId && currentRoomId?.toString() !== newRoomId.toString()) {
      const userId = user._id;
      const roomId = newRoomId;
      const userType =
        user.rentType === "monthly" ? "longTermResident" : "dailyRenter";

      // Add to new room
      await assignRoomToUser({userId, roomId, userType});
    }

    // If property is being changed (without room change)
    if (newPropertyId && currentPropertyId !== newPropertyId && !newRoomId) {
      // console.log("hererere reachedddd"); // Update property counts through API
      await updatePropertyCounts(currentPropertyId, newPropertyId);
    }
  } catch (error) {
    console.error("Room/property update error:", error);
    throw error;
  }
};
