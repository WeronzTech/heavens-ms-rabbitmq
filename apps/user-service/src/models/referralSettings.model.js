import mongoose from "mongoose";

const referralSettingsSchema = new mongoose.Schema({
  rewardAmount: {
    type: Number,
    required: true,
  },
  // You could add other settings here in the future,
  // like minimum deposit amount to qualify.
});

const ReferralSettings = mongoose.model(
  "ReferralSettings",
  referralSettingsSchema
);

export default ReferralSettings;
