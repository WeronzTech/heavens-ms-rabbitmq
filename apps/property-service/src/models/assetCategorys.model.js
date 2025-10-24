import { Schema, model } from "mongoose";

const AssetCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

export const AssetCategory = model("AssetCategory", AssetCategorySchema);
