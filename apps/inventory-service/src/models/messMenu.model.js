import mongoose, { Schema } from "mongoose";

// Reusable time regex (HH:mm, 24-hour format)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Schema for a single meal
const mealSchema = new Schema(
  {
    mealType: {
      type: String,
      enum: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
    },
    itemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Recipe",
        required: true,
      },
    ],
  },
  { _id: false }
);

// Schema for one day's menu
const dailyMenuSchema = new Schema(
  {
    dayOfWeek: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      required: true,
    },
    meals: {
      type: [mealSchema],
      required: true,
      validate: {
        validator: function (v) {
          const mealTypes = v.map((m) => m.mealType);
          return new Set(mealTypes).size === mealTypes.length;
        },
        message: "Duplicate meal types are not allowed for a day.",
      },
    },
  },
  { _id: false }
);

// Schema for meal timings
const mealTimeSchema = new Schema(
  {
    mealType: {
      type: String,
      enum: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
    },
    start: {
      type: String,
      required: true,
    },
    end: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Main schema for weekly recurring menu
const weeklyMenuSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    kitchenId: {
      type: Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    menu: {
      type: [dailyMenuSchema],
      required: true,
      validate: {
        validator: function (v) {
          const days = v.map((d) => d.dayOfWeek);
          return new Set(days).size === days.length;
        },
        message: "Duplicate days are not allowed in the weekly menu.",
      },
    },
    mealTimes: {
      type: [mealTimeSchema],
      required: true,
      validate: {
        validator: function (v) {
          const types = v.map((m) => m.mealType);
          return new Set(types).size === types.length;
        },
        message: "Duplicate meal times for a meal type are not allowed.",
      },
    },
    bookingStartTime: {
      type: String,
      required: true,
      match: timeRegex, // Enforce time format
    },
    bookingEndTime: {
      type: String,
      required: true,
      match: timeRegex,
    },
  },
  { timestamps: true }
);

// Create a unique index on propertyId for fast lookups and to enforce uniqueness
// weeklyMenuSchema.index( { unique: true });

export const WeeklyMenu = mongoose.model("WeeklyMenu", weeklyMenuSchema);
