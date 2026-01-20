import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { Role } from "../models/role.model.js";
import { Token } from "../models/token.model.js";
import { generateTokens } from "../utils/jwt.utils.js";
import emailService from "../../../../libs/email/email.service.js";
import crypto from "crypto";

// export const tenantLogin = async (data) => {
//   const { email, password } = data;
//   console.log(data);
//   try {
//     const clientResponse = await sendRPCRequest(
//       CLIENT_PATTERN.CLIENT.GET_CLIENT_BY_EMAIL,
//       {
//         email,
//       }
//     );

//     console.log("CLient", clientResponse);

//     const client = clientResponse?.data;

//     if (!client || !client.role) {
//       return {
//         success: false,
//         status: 401,
//         message: "Invalid credentials",
//       };
//     }

//     const role = await Role.findById(client.role);
//     if (!role) {
//       return {
//         success: false,
//         status: 401,
//         message: "Role not found for this user",
//       };
//     }

//     const isPasswordValid = await bcrypt.compare(password, client.password);
//     if (!isPasswordValid) {
//       return {
//         success: false,
//         status: 401,
//         message: "Invalid password",
//       };
//     }

//     if (!client.loginEnabled) {
//       return {
//         success: false,
//         status: 403,
//         message: "Login disabled for this account",
//       };
//     }

//     const token = jwt.sign(
//       {
//         id: client._id,
//         roleId: role._id,
//         roleName: role.roleName,
//         permissions: role.permissions,
//         userName: client.name,
//       },
//       process.env.JWT_SECRET_KEY,
//       { expiresIn: "1d" }
//     );

//     return {
//       success: true,
//       status: 200,
//       message: "Login successful",
//       data: {
//         token,
//         client: {
//           id: client._id,
//           email: client.email,
//           name: client.name,
//           properties: client.propertyId,
//           role: {
//             id: role._id,
//             name: role.roleName,
//             type: role.roleType,
//             permissions: role.permissions,
//           },
//         },
//       },
//     };
//   } catch (error) {
//     console.error("Login service error:", error.message);
//     return {
//       success: false,
//       status: 500,
//       message: error.message || "An internal server error occurred.",
//     };
//   }
// };
export const tenantLogin = async (data) => {
  const { email, password } = data;

  try {
    let userResponse;
    let userType = "CLIENT";

    // 1️⃣ Try Client login first
    userResponse = await sendRPCRequest(
      CLIENT_PATTERN.CLIENT.GET_CLIENT_BY_EMAIL,
      { email }
    );

    let user = userResponse?.data;

    // 2️⃣ If client not found → try Manager
    if (!user) {
      userType = "MANAGER";

      userResponse = await sendRPCRequest(
        CLIENT_PATTERN.MANAGER.GET_MANAGER_BY_EMAIL,
        { email }
      );

      user = userResponse?.data;
    }

    // 3️⃣ User not found
    if (!user || !user.role) {
      return {
        success: false,
        status: 401,
        message: "Invalid credentials",
      };
    }

    // 4️⃣ Fetch role
    const role = await Role.findById(user.role);
    if (!role) {
      return {
        success: false,
        status: 401,
        message: "Role not found for this user",
      };
    }

    // 5️⃣ Password validation
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        status: 401,
        message: "Invalid password",
      };
    }

    // 6️⃣ Login enabled check
    if (!user.loginEnabled) {
      return {
        success: false,
        status: 403,
        message: "Login disabled for this account",
      };
    }

    // 7️⃣ Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        roleId: role._id,
        roleName: role.roleName,
        permissions: role.permissions,
        userName: user.name,
        userType, // 👈 CLIENT or MANAGER
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" }
    );

    // 8️⃣ Unified response
    return {
      success: true,
      status: 200,
      message: "Login successful",
      data: {
        token,
        client: {
          id: user._id,
          email: user.email,
          name: user.name,
          userType,
          properties: user.propertyId || [],
          role: {
            id: role._id,
            name: role.roleName,
            type: role.roleType,
            permissions: role.permissions,
          },
        },
      },
    };
  } catch (error) {
    console.error("Login service error:", error.message);
    return {
      success: false,
      status: 500,
      message: error.message || "An internal server error occurred.",
    };
  }
};

export const userLogin = async (loginData) => {
  const { email, password, deviceId, deviceInfo } = loginData;

  try {
    // 1. Fetch user data from User Service
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_EMAIL,
      { email }
    );

    if (!userResponse.success) {
      return {
        success: false,
        status: userResponse.status || 401,
        message: userResponse.message || "Email not registered in our system.",
      };
    }
    const user = userResponse.data;

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        status: 401,
        message: "The password you entered is incorrect.",
      };
    }

    // 3. Check user status conditions
    if (user.currentStatus === "checked_out") {
      return {
        success: false,
        status: 403,
        message: "You have already checked out from Heavens Living.",
      };
    }
    if (!user.isApproved) {
      return {
        success: false,
        status: 403,
        message: "Your account has not been approved by the admin yet.",
      };
    }
    if (!user.isLoginEnabled) {
      return {
        success: false,
        status: 403,
        message: "Login access has been disabled. Please contact support.",
      };
    }

    // 4. Device limit check
    const existingDevice = await Token.findOne({
      userId: user._id,
      deviceId,
    }).exec();
    if (!existingDevice) {
      const distinctDeviceCount = await Token.countDocuments({
        userId: user._id,
        deviceId: { $ne: deviceId },
      });
      if (distinctDeviceCount >= 10) {
        return {
          success: false,
          status: 403,
          message:
            "Maximum devices reached. Please logout from another device.",
        };
      }
    }

    // 5. Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user, deviceId);

    // 6. Update or create token document in the database
    await Token.findOneAndUpdate(
      { userId: user._id, deviceId },
      {
        $set: {
          currentRefreshToken: refreshToken,
          deviceInfo,
          lastUsed: new Date(),
        },
        $push: {
          previousRefreshTokens: {
            $each: [{ token: refreshToken, createdAt: new Date() }],
            $slice: -5, // Keep last 5 refresh tokens
          },
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true }
    );

    // 7. Return success response
    return {
      success: true,
      status: 200,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          userType: user.userType,
        },
        deviceInfo,
      },
    };
  } catch (error) {
    console.error("User login service error:", error);
    return {
      success: false,
      status: 500,
      message: "An internal server error occurred during login.",
    };
  }
};

const RESET_TOKEN_EXPIRY_HOURS = 1;
const FRONTEND_URL = "https://hpanel.heavensliving.in";

export const forgotPasswordUser = async (data) => {
  const { email } = data;
  if (!email) {
    return { success: false, status: 400, message: "Email is required" };
  }
  try {
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_EMAIL,
      { email }
    );
    if (!userResponse.success) {
      return {
        success: false,
        status: userResponse.status || 401,
        message: userResponse.message || "Email not registered in our system.",
      };
    }
    const user = userResponse.data;
    if (!user) {
      return { success: false, status: 404, message: "User not found" };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const tokenExpiry = Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

    await sendRPCRequest(USER_PATTERN.USER.SET_RESET_TOKEN, {
      userId: user._id,
      token: hashedToken,
      expiry: tokenExpiry,
    });

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

    await emailService.sendPasswordResetEmail(
      user,
      resetUrl,
      RESET_TOKEN_EXPIRY_HOURS
    );

    return {
      success: true,
      status: 200,
      message: "Password reset link sent to your email",
      data: { resetUrl }, // optionally return reset URL (remove if sensitive)
    };
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

export const resetPassword = async (data) => {
  const { token, password } = data;

  if (!token || !password) {
    return {
      success: false,
      status: 400,
      message: "Token and password are required",
    };
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // ✅ Ask user-service to validate token + get user
    const userResponse = await sendRPCRequest(
      USER_PATTERN.PASSWORD.GET_USER_BY_RESET_TOKEN,
      { token: hashedToken }
    );

    if (!userResponse.success) {
      return {
        success: false,
        status: userResponse.status || 400,
        message: userResponse.message || "Invalid or expired token",
      };
    }

    const user = userResponse.data;

    // ✅ Tell user-service to update password
    await sendRPCRequest(USER_PATTERN.PASSWORD.UPDATE_PASSWORD, {
      userId: user._id,
      password, // raw password — user-service will hash internally
    });

    return {
      success: true,
      status: 200,
      message: "Password has been reset successfully",
    };
  } catch (error) {
    console.error("Reset Password Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
    };
  }
};

export const refreshAccessToken = async (data) => {
  const { refreshToken, deviceId } = data;
  console.log("herere the refreshhhxxx");
  console.log(refreshToken, deviceId);

  if (!refreshToken || !deviceId) {
    return {
      status: 401,
      error: "Refresh token and device ID are required",
    };
  }

  try {
    // Verify the refresh token first
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userId = decoded.id;

    // Find the device token document
    const tokenDoc = await Token.findOne({
      userId,
      deviceId,
    });

    if (!tokenDoc) {
      return {
        status: 403,
        error: "Invalid refresh token - device not found",
      };
    }

    // Check if the token matches current or previous tokens
    let isValidToken = false;

    if (tokenDoc.currentRefreshToken === refreshToken) {
      isValidToken = true;
    } else {
      // Check previous tokens (for token rotation scenarios)
      isValidToken = tokenDoc.previousRefreshTokens.some(
        (t) => t.token === refreshToken
      );
    }

    if (!isValidToken) {
      return { status: 403, error: "Invalid refresh token" };
    }

    // Get fresh student data
    const userResponse = await sendRPCRequest(
      USER_PATTERN.USER.GET_USER_BY_ID,
      { userId }
    );
    const user = userResponse.body.data;

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
      user,
      deviceId
    );

    // Update the token document with the new refresh token
    await Token.updateOne(
      { userId, deviceId },
      {
        $set: {
          currentRefreshToken: newRefreshToken,
          lastUsed: new Date(),
        },
        $push: {
          previousRefreshTokens: {
            $each: [{ token: refreshToken, createdAt: new Date() }],
            $slice: -5, // Keep last 5 refresh tokens
          },
        },
      }
    );

    return {
      status: 200,
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error("Refresh token error:", error);

    if (error.name === "TokenExpiredError") {
      return { status: 403, error: "Refresh token expired" };
    }
    if (error.name === "JsonWebTokenError") {
      return { status: 403, error: "Invalid refresh token" };
    }

    return { status: 500, error: "Internal server error" };
  }
};
