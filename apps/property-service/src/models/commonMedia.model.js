import mongoose from "mongoose";

const mediaItemSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  url: { type: String, required: true },
  key: { type: String, default: "" },
  type: {
    type: String,
    enum: ["image", "video"],
    required: true,
  },
});

const commonMediaSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ["homePage", "mobileApp", "gallery", "other"],
    },

    mediaItems: {
      type: [mediaItemSchema],
      default: [],
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CommonMedia", commonMediaSchema);
