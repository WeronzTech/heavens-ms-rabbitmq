import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema({
  name: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true,
  },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true, enum: ["kg", "g", "l", "ml"] },
});

const recipeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ingredients: {
      type: [ingredientSchema],
      required: true,
    },
    servings: {
      type: Number,
      required: true,
    },
    tags: [String],
    kitchenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    veg: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

const Recipe = mongoose.model("Recipe", recipeSchema);

export default Recipe;
