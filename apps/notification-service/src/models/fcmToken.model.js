import mongoose from "mongoose";

const fcmTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      unique: true,
    },
    token: {
      type: [String],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const FcmToken = mongoose.model("FcmToken", fcmTokenSchema);
export default FcmToken;
