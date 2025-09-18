import mongoose, { Schema } from "mongoose";

// Addon schema
const addonSchema = new Schema(
  {
    kitchenId: {
      type: Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "Recipe",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    itemDescription: {
      type: String,
      required: false,
      trim: true,
    },
    itemImage: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Beverages", "Snacks", "Others"],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      required: false,
      min: 0,
    },
    tag: {
      type: String,
      required: false,
    },
    rating: {
      type: Number,
      required: false,
    },
    mealType: {
      type: [String],
      enum: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one meal type must be specified",
      },
    },
    isAvailable: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for performance when filtering by propertyId, mealType and availability
addonSchema.index({ propertyId: 1, mealType: 1, isAvailable: 1 });

export const Addon = mongoose.model("Addon", addonSchema);
