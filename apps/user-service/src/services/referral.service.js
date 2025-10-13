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

const getReferralLevel = (referralCount, levels) => {
  // Sort levels by referrals needed in descending order to find the highest applicable level
  const sortedLevels = [...levels].sort(
    (a, b) => b.referralsNeeded - a.referralsNeeded
  );
  for (const level of sortedLevels) {
    if (referralCount >= level.referralsNeeded) {
      return level;
    }
  }
  return null; // Return null if no level is matched
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

    // --- LEVEL-BASED LOGIC START ---
    if (!settings || !settings.levels || settings.levels.length === 0) {
      return {
        success: false,
        status: 404,
        message: "Referral level settings are not configured by the admin.",
      };
    }

    const newTotalReferrals = (referrer.referralInfo.totalReferrals || 0) + 1;

    const newLevelInfo = getReferralLevel(newTotalReferrals, settings.levels);

    if (!newLevelInfo) {
      console.log(
        `Referral for ${newUser.name} by ${referrer.name} did not meet criteria for any reward level.`
      );
      // Even if no reward, we still count the referral
      referrer.referralInfo.totalReferrals = newTotalReferrals;
      newUser.referralInfo.isReferralProcessed = true;
      await Promise.all([referrer.save(), newUser.save()]);
      return {
        success: true,
        status: 200,
        message: "Referral processed, but no reward level achieved.",
      };
    }

    const rewardAmount = newLevelInfo.rewardAmount;

    referrer.referralInfo.totalReferrals = newTotalReferrals;
    referrer.referralInfo.currentLevel = newLevelInfo.level;
    referrer.referralInfo.referralEarnings =
      (referrer.referralInfo.referralEarnings || 0) + rewardAmount;
    referrer.referralInfo.availableBalance =
      (referrer.referralInfo.availableBalance || 0) + rewardAmount; // Add to spendable balance
    referrer.referralInfo.referralHistory.referredUsers.push(newUser.name);
    referrer.referralInfo.referralHistory.lastUsed = new Date();

    newUser.referralInfo.isReferralProcessed = true;

    await Promise.all([referrer.save(), newUser.save()]);

    console.log(
      `Referral complete! User ${referrer.name} (Level ${newLevelInfo.level}) earned ₹${rewardAmount} for referring ${newUser.name}.`
    );

    return {
      success: true,
      status: 200,
      message: "Referral completed successfully.",
    };
    // --- LEVEL-BASED LOGIC END ---
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

    if (!settings) {
      // Create default settings if they don't exist
      const defaultLevels = [
        { level: 1, referralsNeeded: 1, rewardAmount: 100 },
        { level: 2, referralsNeeded: 5, rewardAmount: 150 },
        { level: 3, referralsNeeded: 15, rewardAmount: 200 },
        { level: 4, referralsNeeded: 30, rewardAmount: 250 },
      ];
      settings = await ReferralSettings.create({
        levels: defaultLevels,
        maxUsagePerTransaction: 500,
      });
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
    const { levels, maxUsagePerTransaction } = data;

    // Add validation for the new structure
    if (!levels || !Array.isArray(levels) || levels.length === 0) {
      return {
        success: false,
        status: 400,
        message: "A valid 'levels' array is required.",
      };
    }

    if (
      maxUsagePerTransaction === undefined ||
      typeof maxUsagePerTransaction !== "number"
    ) {
      return {
        success: false,
        status: 400,
        message: "A valid 'maxUsagePerTransaction' is required.",
      };
    }

    const settings = await ReferralSettings.findOneAndUpdate(
      {},
      { $set: { levels, maxUsagePerTransaction } },
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
