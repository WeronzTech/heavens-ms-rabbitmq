import mongoose from "mongoose";
import ReferralSettings from "../models/referralSettings.js";

export const generateReferralLink = (studentId, studentName) => {
  const encodedId = Buffer.from(studentId.toString()).toString("base64url");
  return `${process.env.USER_SERVICE_URL}/ref/${encodedId}?name=${studentName}`;
};

export const extractStudentIdFromReferralLink = (referralLink) => {
  try {
    const url = new URL(referralLink);
    const segments = url.pathname.split("/");
    const code = segments[segments.length - 1];
    const decodedId = Buffer.from(code, "base64url").toString("utf8");
    const name = url.searchParams.get("name");

    return mongoose.Types.ObjectId.isValid(decodedId)
      ? { studentId: decodedId, name }
      : null;
  } catch (err) {
    return null;
  }
};

export const getReferralLevelAndRewardFromDB = async (totalReferrals) => {
  const settings = await ReferralSettings.findOne().lean();

  if (!settings || !settings.levels) {
    throw new Error("Referral level settings not found in DB");
  }

  const levels = settings.levels;

  let levelIndex = 0;
  let referralsLeft = totalReferrals;

  while (
    levelIndex < levels.length &&
    referralsLeft >= levels[levelIndex].requiredReferrals
  ) {
    referralsLeft -= levels[levelIndex].requiredReferrals;
    levelIndex++;
  }

  const currentLevel = levels[Math.min(levelIndex, levels.length - 1)];
  return {
    level: currentLevel.level,
    reward: currentLevel.rewardPerReferral,
  };
};
