import User from "../models/user.model.js";
import ReferralSettings from "../models/referralSettings.model.js";
import mongoose from "mongoose";
import crypto from "crypto";

const generateUniqueReferralCode = async () => {
  let referralCode;
  let isUnique = false;
  while (!isUnique) {
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    referralCode = `HVNS-${randomPart}`;
    const existingUser = await User.findOne({
      "referralInfo.referralCode": referralCode,
    });
    if (!existingUser) {
      isUnique = true;
    }
  }
  return referralCode;
};

export const getUserReferralDetails = async (data) => {
  try {
    const { userId } = data;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return {
        success: false,
        status: 400,
        message: "Valid User ID is required.",
      };
    }

    const user = await User.findById(userId, "referralInfo name");
    if (!user) {
      return { success: false, status: 404, message: "User not found." };
    }

    if (!user.referralInfo?.referralCode) {
      user.referralInfo.referralCode = await generateUniqueReferralCode();
      await user.save();
    }

    return {
      success: true,
      status: 200,
      message: "Referral details retrieved successfully.",
      data: user.referralInfo,
    };
  } catch (error) {
    console.error("Get User Referral Details Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const completeReferral = async (data) => {
  try {
    const { newUserId } = data;
    if (!newUserId) {
      return {
        success: false,
        status: 400,
        message: "New User ID is required to complete referral.",
      };
    }

    const newUser = await User.findById(newUserId);
    if (!newUser) {
      return { success: false, status: 404, message: "New user not found." };
    }

    const { referredByCode, isReferralProcessed } = newUser.referralInfo || {};

    if (isReferralProcessed) {
      return {
        success: true,
        status: 200,
        message: "Referral already processed.",
      };
    }

    if (!referredByCode) {
      return { success: true, status: 200, message: "No referral code used." };
    }

    const [referrer, settings] = await Promise.all([
      User.findOne({ "referralInfo.referralCode": referredByCode }),
      ReferralSettings.findOne().sort({ createdAt: -1 }),
    ]);

    if (!referrer) {
      return {
        success: false,
        status: 404,
        message: "Original referrer not found for the provided code.",
      };
    }

    if (referrer._id.toString() === newUserId.toString()) {
      return {
        success: false,
        status: 400,
        message: "Self-referral is not allowed.",
      };
    }

    const rewardAmount = settings ? settings.rewardAmount : 250;

    referrer.referralInfo.totalReferrals =
      (referrer.referralInfo.totalReferrals || 0) + 1;
    referrer.referralInfo.referralEarnings =
      (referrer.referralInfo.referralEarnings || 0) + rewardAmount;
    referrer.referralInfo.referralHistory.referredUsers.push(newUser.name);
    referrer.referralInfo.referralHistory.lastUsed = new Date();

    newUser.referralInfo.isReferralProcessed = true;

    await Promise.all([referrer.save(), newUser.save()]);

    console.log(
      `Referral complete! User ${referrer.name} earned ₹${rewardAmount} for referring ${newUser.name}.`
    );

    return {
      success: true,
      status: 200,
      message: "Referral completed successfully.",
    };
  } catch (error) {
    console.error("Complete Referral Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const getReferralSettings = async () => {
  try {
    let settings = await ReferralSettings.findOne();

    // If no settings exist, create a default one
    if (!settings) {
      settings = await ReferralSettings.create({ rewardAmount: 250 });
    }

    return {
      success: true,
      status: 200,
      message: "Referral settings retrieved successfully.",
      data: settings,
    };
  } catch (error) {
    console.error("Get Referral Settings Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const upsertReferralSettings = async (data) => {
  try {
    const { rewardAmount } = data;
    if (rewardAmount === undefined || typeof rewardAmount !== "number") {
      return {
        success: false,
        status: 400,
        message: "A valid 'rewardAmount' is required.",
      };
    }

    // Find one and update, or create if it doesn't exist (upsert)
    const settings = await ReferralSettings.findOneAndUpdate(
      {}, // An empty filter will match the first document found
      { $set: { rewardAmount } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return {
      success: true,
      status: 200,
      message: "Referral settings updated successfully.",
      data: settings,
    };
  } catch (error) {
    console.error("Upsert Referral Settings Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
