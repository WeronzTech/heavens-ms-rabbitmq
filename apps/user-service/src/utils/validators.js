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
  contact,
  stayDetails,
  messDetails
) {
  // Common required fields
  if (!name || !contact || !userType) {
    return {
      status: "error",
      message:
        "Missing any of the required fields: name, email, contact, password, userType",
    };
  }

  // Type-specific validations
  if (userType === "messOnly") {
    if (!messDetails) {
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

  // Validate email only if value is provided
  if (email) {
    if (!validateEmail(email)) {
      errors.push("Invalid email format");
    }
  }

  // Validate password only if value is provided
  if (password) {
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      errors.push(`Password requirements: ${passwordErrors.join(", ")}`);
    }
  }

  // Always validate contact
  if (!validateContact(contact)) {
    errors.push(
      "Invalid contact number (must be 10 digits, starting with 6-9)"
    );
  }

  return errors;
}

export async function checkExistingUsers(
  email,
  contact,
  userType,
  colivingPartner = null
) {
  try {
    // Normalize inputs into arrays (for unified checking)
    const emailsToCheck = [];
    const contactsToCheck = [];

    if (email) emailsToCheck.push(email);
    if (contact) contactsToCheck.push(contact);

    if (colivingPartner) {
      if (colivingPartner.email) emailsToCheck.push(colivingPartner.email);
      if (colivingPartner.contact)
        contactsToCheck.push(colivingPartner.contact);
    }

    // Build dynamic query
    const query = {
      $or: [],
    };

    // For all user types except dailyRent, include emails
    if (userType !== "dailyRent" && emailsToCheck.length > 0) {
      query.$or.push(...emailsToCheck.map((e) => ({ email: e })));
    }

    // Add contacts for all user types
    if (contactsToCheck.length > 0) {
      query.$or.push(...contactsToCheck.map((c) => ({ contact: c })));
    }

    if (query.$or.length === 0) {
      return { error: false }; // nothing to check
    }

    const existingUser = await User.findOne(query);

    if (existingUser) {
      // Determine whether it’s the main user or coliving partner duplicate
      const duplicateEmail = emailsToCheck.includes(existingUser.email);
      const duplicateContact = contactsToCheck.includes(existingUser.contact);

      let message = "User already exists";
      if (duplicateEmail) message = "Email already registered";
      if (duplicateContact) message = "Contact number already registered";

      // More specific context for coliving duplicates
      if (colivingPartner) {
        if (duplicateEmail && colivingPartner.email === existingUser.email) {
          message = "Coliving partner's email already registered";
        }
        if (
          duplicateContact &&
          colivingPartner.contact === existingUser.contact
        ) {
          message = "Coliving partner's contact number already registered";
        }
      }

      return { error: true, message };
    }

    return { error: false };
  } catch (err) {
    console.error("❌ Error checking existing users:", err);
    return { error: true, message: "Error checking existing users" };
  }
}

// export async function checkExistingUsers(email, contact, userType) {
//   try {
//     // For all user types except DailyRent, check email if provided
//     if (userType !== "dailyRent" && email) {
//       const existingByEmail = await User.findOne({ email });
//       if (existingByEmail) {
//         return { error: true, message: "Email already registered" };
//       }
//     }

//     // For all user types, check contact
//     const existingByContact = await User.findOne({ contact });
//     if (existingByContact) {
//       return { error: true, message: "Contact number already registered" };
//     }

//     return { error: false };
//   } catch (err) {
//     console.error("Error checking existing users:", err);
//     return { error: true, message: "Error checking existing users" };
//   }
// }

export function calculateNextDueDate(joinDate) {
  const nextDate = new Date(joinDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
}
