import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import { USER_PATTERN } from "../../../../libs/patterns/user/user.pattern.js";
import { Role } from "../models/role.model.js";
import { Token } from "../models/token.model.js";
import { generateTokens } from "../utils/jwt.utils.js";

export const tenantLogin = async (data) => {
  const { email, password } = data;
  console.log("Data", data);

  try {
    const clientResponse = await sendRPCRequest(
      CLIENT_PATTERN.CLIENT.GET_CLIENT_BY_EMAIL,
      {
        email,
      }
    );
    console.log("CLient", clientResponse);

    const client = clientResponse?.data;

    if (!client || !client.role) {
      return {
        success: false,
        status: 401,
        message: "Invalid credentials",
      };
    }

    const role = await Role.findById(client.role);
    if (!role) {
      return {
        success: false,
        status: 401,
        message: "Role not found for this user",
      };
    }

    const isPasswordValid = await bcrypt.compare(password, client.password);
    if (!isPasswordValid) {
      return {
        success: false,
        status: 401,
        message: "Invalid password",
      };
    }

    if (!client.loginEnabled) {
      return {
        success: false,
        status: 403,
        message: "Login disabled for this account",
      };
    }

    const token = jwt.sign(
      {
        id: client._id,
        roleId: role._id,
        roleName: role.roleName,
        permissions: role.permissions,
        userName: client.name,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" }
    );

    return {
      success: true,
      status: 200,
      message: "Login successful",
      data: {
        token,
        client: {
          id: client._id,
          email: client.email,
          name: client.name,
          properties: client.propertyId,
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
          id: user.userId,
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
