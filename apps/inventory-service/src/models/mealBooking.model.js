import mongoose, { Schema } from "mongoose";
import DatabaseCounter from "./databaseCounter.model.js";

const mealBookingSchema = new Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    userId: { type: Schema.Types.ObjectId, required: true },
    partnerName: {
      type: String,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    kitchenId: {
      type: Schema.Types.ObjectId,
      ref: "Kitchen",
      required: false,
    },
    menuId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklyMenu",
      required: true,
    },
    bookingDate: { type: Date, default: Date.now() }, // The date the meal is booked for
    deliveredDate: { type: Date, default: null },
    mealType: {
      type: String,
      enum: ["Breakfast", "Lunch", "Snacks", "Dinner"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Delivered"],
      default: "Pending",
    },
    token: {
      type: Boolean,
      default: false,
    },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

mealBookingSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = `0${now.getMonth() + 1}`.slice(-2);

      let counter = await DatabaseCounter.findOneAndUpdate(
        {
          type: "Mess",
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!counter) {
        throw new Error("Counter document could not be created or updated.");
      }

      const customId = `HVNS-OM${year}${month}${counter.count}`;
      this.orderId = customId;
    }
    next();
  } catch (error) {
    next(error);
  }
});

export const MealBooking = mongoose.model("MealBooking", mealBookingSchema);
