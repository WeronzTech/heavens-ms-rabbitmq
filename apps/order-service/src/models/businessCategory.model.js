import mongoose from "mongoose";

const BusinessCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    bannerImageURL: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const BusinessCategory = mongoose.model(
  "BusinessCategory",
  BusinessCategorySchema
);
export default BusinessCategory;
