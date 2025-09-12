import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { AUTH_PATTERN } from "../../../../../libs/patterns/auth/auth.pattern.js";

export const tenantLogin = async (req, res) => {
  const { email, password, roleName } = req.body;
  console.log("Here");
  const response = await sendRPCRequest(AUTH_PATTERN.AUTH.TENANT_LOGIN, {
    email,
    password,
    roleName,
  });

  if (response.status === 200) {
    return res.status(200).json(response?.data);
  } else {
    return res.status(response?.status).json({ message: response.message });
  }
};

export const userLogin = async (req, res) => {
  const { email, password, deviceId } = req.body;
  console.log("Here");
  const response = await sendRPCRequest(AUTH_PATTERN.AUTH.USER_LOGIN, {
    email,
    password,
    deviceId,
  });

  if (response.status === 200) {
    return res.status(200).json(response?.data);
  } else {
    return res.status(response?.status).json({ message: response.message });
  }
};

// export const userLogin = async (req, res) => {
//   const startTime = Date.now();
//   const { email, password, deviceId } = req.body;

//   if (!email || !password || !deviceId) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   try {
//     const user = await fetchUserAuthData(email).catch(() => null);

//     if (!user) {
//       return res.status(401).json({
//         error: "Email not registered",
//         message: "This email is not registered in our system.",
//       });
//     }

//     const [isPasswordValid, existingDevice] = await Promise.all([
//       bcrypt.compare(password, user.password),
//       Token.findOne({ userId: user.userId, deviceId }).exec(),
//     ]);

//     if (!isPasswordValid) {
//       return res.status(401).json({
//         error: "Incorrect password",
//         message: "The password you entered is incorrect.",
//       });
//     }

//     if (user.currentStatus === "checked_out") {
//       return res.status(403).json({
//         error: "Checked out",
//         message: "You have already checked out from Heavens Living",
//       });
//     }

//     if (!user.isApproved) {
//       return res.status(403).json({
//         error: "Pending approval",
//         message: "Your account has not been approved by the admin yet.",
//       });
//     }

//     if (!user.isLoginEnabled) {
//       return res.status(403).json({
//         error: "Login disabled",
//         message: "Login access has been disabled. Please contact support.",
//       });
//     }

//     if (!existingDevice) {
//       const distinctDeviceCount = await Token.countDocuments({
//         userId: user.userId,
//         deviceId: { $ne: deviceId },
//       });

//       if (distinctDeviceCount >= 10) {
//         return res.status(403).json({
//           error: "Maximum devices reached",
//           message: "Please logout from another device or contact support",
//         });
//       }
//     }

//     const deviceInfo = {
//       deviceId,
//       os: {
//         name: req.useragent.os,
//         version: req.useragent.version || "unknown",
//         platform: req.useragent.platform,
//       },
//       browser: {
//         name: req.useragent.browser,
//         version: req.useragent.version,
//       },
//       ip: req.ip,
//       geo: req.headers["x-geo"] || null,
//       screen: req.headers["x-screen-resolution"] || null,
//     };

//     const { accessToken, refreshToken } = await generateTokens(
//       user,
//       deviceId,
//       deviceInfo
//     );

//     await Token.findOneAndUpdate(
//       { userId: user.userId, deviceId },
//       {
//         $set: {
//           currentRefreshToken: refreshToken,
//           deviceInfo,
//           lastUsed: new Date(),
//         },
//         $push: {
//           previousRefreshTokens: {
//             $each: [{ token: refreshToken, createdAt: new Date() }],
//             $slice: -5, // Keep last 5 refresh tokens
//           },
//         },
//         $setOnInsert: { createdAt: new Date() },
//       },
//       { upsert: true, new: true }
//     );

//     console.log(`Login processed in ${Date.now() - startTime}ms`);

//     return res.status(200).json({
//       accessToken,
//       refreshToken,
//       user: {
//         id: user.userId,
//         email: user.email,
//         userType: user.userType,
//       },
//       deviceInfo,
//     });
//   } catch (error) {
//     console.error(`Login error (${Date.now() - startTime}ms):`, error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const logout = async (req, res) => {
//   try {
//     const { refreshToken, deviceId } = req.body;
//     const userId = req.user.id;

//     if (!refreshToken || !deviceId) {
//       return res.status(400).json({
//         success: false,
//         error: "Refresh token and device ID are required",
//       });
//     }

//     const tokenDoc = await Token.findOne({
//       userId,
//       deviceId,
//     });

//     if (!tokenDoc) {
//       return res.status(200).json({
//         success: true,
//         message: "No active session found for this device",
//       });
//     }

//     let tokenFound = false;

//     // Check current refresh token
//     if (tokenDoc.currentRefreshToken === refreshToken) {
//       await Token.deleteOne({ userId, deviceId });
//       tokenFound = true;
//     }
//     // Check previous refresh tokens
//     else {
//       const tokenIndex = tokenDoc.previousRefreshTokens.findIndex(
//         (t) => t.token === refreshToken
//       );

//       if (tokenIndex >= 0) {
//         await Token.updateOne(
//           { userId, deviceId },
//           {
//             $pull: {
//               previousRefreshTokens: { token: refreshToken },
//             },
//           }
//         );
//         tokenFound = true;
//       }
//     }

//     if (!tokenFound) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid refresh token for this device",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Logged out successfully",
//     });
//   } catch (error) {
//     console.error("Logout error:", error);
//     res.status(500).json({
//       success: false,
//       error: "Internal server error during logout",
//     });
//   }
// };

// const RESET_TOKEN_EXPIRY_HOURS = 1;
// const FRONTEND_URL = process.env.FRONTEND_URL || "https://yourfrontend.com";

// export const forgotPasswordStudent = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ message: "Email is required" });
//   }

//   try {
//     const user = await Student.findOne({ email }).lean();
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const rawToken = crypto.randomBytes(32).toString("hex");
//     const hashedToken = crypto
//       .createHash("sha256")
//       .update(rawToken)
//       .digest("hex");
//     const tokenExpiry = Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

//     await Student.updateOne(
//       { _id: user._id },
//       {
//         resetPasswordToken: hashedToken,
//         resetPasswordExpires: tokenExpiry,
//       }
//     );

//     const resetUrl = `${FRONTEND_URL}/resident/reset-password?token=${rawToken}`;

//     // 🔔 Call Notification Service REST API
//     // await notifyPasswordReset({
//     //   email: user.email,
//     //   name: user.name,
//     //   resetUrl,
//     //   expiryHours: RESET_TOKEN_EXPIRY_HOURS,
//     // });

//     return res.status(200).json({
//       message: "Password reset link sent to your email",
//     });
//   } catch (error) {
//     console.error("Forgot Password Error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// const resetPassword = async (req, res) => {
//   const { token } = req.params;
//   const { newPassword } = req.body;

//   try {
//     // Hash the token to compare with stored value
//     const resetPasswordToken = crypto
//       .createHash("sha256")
//       .update(token)
//       .digest("hex");

//     // Try to find user in both collections
//     const [student, messPerson] = await Promise.all([
//       Student.findOne({
//         resetPasswordToken,
//         resetPasswordExpires: { $gt: Date.now() },
//       }),
//       messOnlyPeople.findOne({
//         resetPasswordToken,
//         resetPasswordExpires: { $gt: Date.now() },
//       }),
//     ]);

//     const user = student || messPerson;

//     if (!user) {
//       return res.status(400).json({
//         message: "The reset link has expired. Please request a new one.",
//       });
//     }

//     // Hash and update password
//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;

//     // Clear token and expiry
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;

//     await user.save();

//     res.status(200).json({ message: "Password reset successfully" });
//   } catch (error) {
//     console.error("Reset Password Error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
