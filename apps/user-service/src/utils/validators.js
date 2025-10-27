import User from "../models/user.model.js";

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  const errors = [];

  if (password.length < 6) errors.push("at least 6 characters");
  if (!/[A-Z]/.test(password)) errors.push("an uppercase letter");
  if (!/\d/.test(password)) errors.push("a number");
  if (!/[@$!%*?&]/.test(password)) errors.push("a special character");

  return errors;
}

export function validateContact(contact) {
  // Example: 10-digit Indian mobile number starting with 6-9
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(contact);
}

// Helper Functions
export function validateRequiredFields(
  userType,
  rentType,
  name,
  email,
  contact,
  stayDetails,
  messDetails
) {
  // Common required fields
  if (!name || !email || !contact || !userType) {
    return {
      status: "error",
      message:
        "Missing any of the required fields: name, email, contact, password, userType",
    };
  }

  // Type-specific validations
  if (userType === "messOnly") {
    if (!messDetails || !messDetails.mealType) {
      return {
        status: "error",
        message: "For MessOnly users, monthlyRent and mealType are required",
      };
    }
  } else {
    if (!rentType) {
      return {
        status: "error",
        message: "rentType is required for non-MessOnly users",
      };
    }
    if (!stayDetails || (!stayDetails.dailyRent && !stayDetails.monthlyRent)) {
      return {
        status: "error",
        message: "stayDetails with rent amount is required",
      };
    }
  }

  return null;
}

export function validateFieldFormats(email, password, contact) {
  const errors = [];

  if (email && !validateEmail(email)) {
    errors.push("Invalid email format");
  }

  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    errors.push(`Password requirements: ${passwordErrors.join(", ")}`);
  }

  if (!validateContact(contact)) {
    errors.push(
      "Invalid contact number (must be 10 digits, starting with 6-9)"
    );
  }

  return errors;
}

export async function checkExistingUsers(email, contact, userType) {
  try {
    // For all user types except DailyRent, check email if provided
    if (userType !== "dailyRent" && email) {
      const existingByEmail = await User.findOne({ email });
      if (existingByEmail) {
        return { error: true, message: "Email already registered" };
      }
    }

    // For all user types, check contact
    const existingByContact = await User.findOne({ contact });
    if (existingByContact) {
      return { error: true, message: "Contact number already registered" };
    }

    return { error: false };
  } catch (err) {
    console.error("Error checking existing users:", err);
    return { error: true, message: "Error checking existing users" };
  }
}

export function calculateNextDueDate(joinDate) {
  const nextDate = new Date(joinDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
}
