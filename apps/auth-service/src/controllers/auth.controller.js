import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { generateTokens } from "../utils/jwt.utils.js";
import { Token } from "../models/token.model.js";
import crypto from "crypto";
import {
  fetchClientAuthData,
  fetchUserAuthData,
} from "../services/internal.service.js";
import { Role } from "../models/role.model.js";
import {
  createResponder,
  sendRPCRequest,
} from "../../../../libs/common/rabbitMq.js";
import { getRoleName, tenantLogin, userLogin } from "../services/auth.service.js";
import { AUTH_PATTERN } from "../../../../libs/patterns/auth/auth.pattern.js";

createResponder(AUTH_PATTERN.AUTH.TENANT_LOGIN, async (data) => {
  return await tenantLogin(data);
});

createResponder(AUTH_PATTERN.AUTH.USER_LOGIN, async (data) => {
  return await userLogin(data);
});

createResponder(AUTH_PATTERN.ROLE.GET_ROLE_NAME, async (data) => {
  return await getRoleName(data);
});

const RESET_TOKEN_EXPIRY_HOURS = 1;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://yourfrontend.com";

export const forgotPasswordStudent = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await Student.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const tokenExpiry = Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

    await Student.updateOne(
      { _id: user._id },
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: tokenExpiry,
      }
    );

    const resetUrl = `${FRONTEND_URL}/resident/reset-password?token=${rawToken}`;

    // 🔔 Call Notification Service REST API
    // await notifyPasswordReset({
    //   email: user.email,
    //   name: user.name,
    //   resetUrl,
    //   expiryHours: RESET_TOKEN_EXPIRY_HOURS,
    // });

    return res.status(200).json({
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    // Hash the token to compare with stored value
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Try to find user in both collections
    const [student, messPerson] = await Promise.all([
      Student.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() },
      }),
      messOnlyPeople.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() },
      }),
    ]);

    const user = student || messPerson;

    if (!user) {
      return res.status(400).json({
        message: "The reset link has expired. Please request a new one.",
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear token and expiry
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
