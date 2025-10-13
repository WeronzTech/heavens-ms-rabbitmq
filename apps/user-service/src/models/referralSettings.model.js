import mongoose from "mongoose";

const referralLevelSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: true,
    },
    // The number of referrals needed to reach this level
    referralsNeeded: {
      type: Number,
      required: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const referralSettingsSchema = new mongoose.Schema(
  {
    levels: [referralLevelSchema], // UPDATED: An array to define multiple levels
    maxUsagePerTransaction: {
      // NEW: Max referral amount usable in one payment
      type: Number,
      required: true,
      default: 500,
    },
  },
  { timestamps: true }
);

const ReferralSettings = mongoose.model(
  "ReferralSettings",
  referralSettingsSchema
);

export default ReferralSettings;
