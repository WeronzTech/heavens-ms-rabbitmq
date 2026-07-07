import mongoose from "mongoose";

const appSettingsSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      default: "",
      trim: true,
    },

    isMessageEnabled: {
      type: Boolean,
      default: false,
    },

    isApplicationAvailable: {
      type: Boolean,
      default: true,
    },

    isDepositPageEnabled: {
      type: Boolean,
      default: true,
    },

    properties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("AppSettings", appSettingsSchema);
