import mongoose from "mongoose";

const recipeCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    recipes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe",
      },
    ],
    kitchenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const RecipeCategory = mongoose.model("RecipeCategory", recipeCategorySchema);

export default RecipeCategory;
