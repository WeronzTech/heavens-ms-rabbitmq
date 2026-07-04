import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

subCategorySchema.index(
  {
    propertyId: 1,
    categoryId: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model("SubCategory", subCategorySchema);