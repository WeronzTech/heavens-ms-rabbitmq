import ShopOwner from "../models/shopOwner.model.js"; // Ensure file name matches your upload
import jwt from "jsonwebtoken";
import crypto from "crypto";

// --- Register Shop Owner ---
export const registerShopOwner = async ({ data }) => {
  try {
    const { fullName, email, phoneNumber, password } = data;

    // Check if user already exists
    const existingUser = await ShopOwner.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return {
        status: 409,
        message: "User with email or phone already exists",
      };
    }

    // Create user
    const shopOwner = await ShopOwner.create({
      fullName,
      email,
      phoneNumber,
      password,
    });

    // Remove password from response
    const createdUser = await ShopOwner.findById(shopOwner._id).select(
      "-password"
    );

    return {
      status: 201,
      data: {
        message: "Shop Owner registered successfully",
        user: createdUser,
      },
    };
  } catch (error) {
    console.error("RPC Register Shop Owner Error:", error);
    return { status: 500, message: error.message };
  }
};

// --- Login Shop Owner ---
export const loginShopOwner = async ({ data }) => {
  try {
    const { email, password } = data;

    if (!email || !password) {
      return { status: 400, message: "Email and password are required" };
    }

    // Find user and explicitly select password
    const shopOwner = await ShopOwner.findOne({ email }).select("+password");

    if (!shopOwner) {
      return { status: 404, message: "User does not exist" };
    }

    const isPasswordValid = await shopOwner.isPasswordCorrect(password);

    if (!isPasswordValid) {
      return { status: 401, message: "Invalid user credentials" };
    }

    // Generate Tokens
    const accessToken = shopOwner.generateAccessToken();
    const refreshToken = shopOwner.generateRefreshToken();

    // Save Refresh Token in DB
    shopOwner.refreshToken = refreshToken;
    await shopOwner.save({ validateBeforeSave: false });

    // Return User (without password) and Tokens
    const loggedInUser = await ShopOwner.findById(shopOwner._id).select(
      "-password"
    );

    return {
      status: 200,
      data: {
        message: "Login successful",
        user: loggedInUser,
        accessToken,
        refreshToken,
      },
    };
  } catch (error) {
    console.error("RPC Login Shop Owner Error:", error);
    return { status: 500, message: error.message };
  }
};

// --- Refresh Access Token ---
export const refreshAccessToken = async ({ data }) => {
  try {
    const { refreshToken: incomingRefreshToken } = data;

    if (!incomingRefreshToken) {
      return { status: 401, message: "Unauthorized request" };
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const shopOwner = await ShopOwner.findById(decodedToken?._id);

    if (!shopOwner) {
      return { status: 401, message: "Invalid refresh token" };
    }

    if (incomingRefreshToken !== shopOwner.refreshToken) {
      return { status: 401, message: "Refresh token is expired or used" };
    }

    const accessToken = shopOwner.generateAccessToken();
    const newRefreshToken = shopOwner.generateRefreshToken();

    shopOwner.refreshToken = newRefreshToken;
    await shopOwner.save({ validateBeforeSave: false });

    return {
      status: 200,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        message: "Tokens refreshed successfully",
      },
    };
  } catch (error) {
    return { status: 401, message: error?.message || "Invalid refresh token" };
  }
};

// --- Get Profile ---
export const getShopOwnerProfile = async ({ data }) => {
  try {
    const { userId } = data;
    const user = await ShopOwner.findById(userId).select("-password");
    if (!user) {
      return { status: 404, message: "User not found" };
    }
    return { status: 200, data: { user } };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

// --- Update Profile ---
export const updateShopOwnerProfile = async ({ data }) => {
  try {
    const { userId, fullName, phoneNumber, email } = data;

    // Ensure email/phone uniqueness if changing
    if (email || phoneNumber) {
      const existingUser = await ShopOwner.findOne({
        $or: [{ email }, { phoneNumber }],
        _id: { $ne: userId }, // Exclude current user
      });
      if (existingUser) {
        return { status: 409, message: "Email or Phone already in use" };
      }
    }

    const updatedUser = await ShopOwner.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(fullName && { fullName }),
          ...(email && { email }),
          ...(phoneNumber && { phoneNumber }),
        },
      },
      { new: true }
    ).select("-password");

    return {
      status: 200,
      data: { message: "Profile updated successfully", user: updatedUser },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

// --- Forgot Password ---
export const forgotPassword = async ({ data }) => {
  try {
    const { email } = data;
    const shopOwner = await ShopOwner.findOne({ email });

    if (!shopOwner) {
      return { status: 404, message: "User not found" };
    }

    // Generate reset token (this method modifies the document instance)
    const resetToken = shopOwner.getResetPasswordToken();
    await shopOwner.save({ validateBeforeSave: false });

    // In a real app, you would send this token via email here using Notification Service
    // For now, we return it so the API Gateway can handle the response or triggering email
    return {
      status: 200,
      data: {
        message: "Reset token generated successfully",
        resetToken,
        // NOTE: In production, do NOT return the token in the response.
        // Send it via email only. Returning here for development/testing flow integration.
      },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};

// --- Reset Password ---
export const resetPassword = async ({ data }) => {
  try {
    const { token, newPassword } = data;

    // Create token hash to compare with DB
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const shopOwner = await ShopOwner.findOne({
      resetPasswordToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!shopOwner) {
      return {
        status: 400,
        message: "Password reset token is invalid or expired",
      };
    }

    shopOwner.password = newPassword;
    shopOwner.resetPasswordToken = undefined;
    shopOwner.resetPasswordExpiry = undefined;

    await shopOwner.save();

    return {
      status: 200,
      data: { message: "Password reset successfully" },
    };
  } catch (error) {
    return { status: 500, message: error.message };
  }
};
