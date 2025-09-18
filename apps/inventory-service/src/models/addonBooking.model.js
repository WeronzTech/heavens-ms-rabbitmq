import mongoose, { Schema } from "mongoose";
import DatabaseCounter from "./databaseCounter.model.js";

// Addon item schema for addon bookings
const addonItemSchema = new Schema(
  {
    addonId: {
      type: Schema.Types.ObjectId,
      ref: "Addon",
      required: true,
    },
    mealType: {
      type: String,
      enum: ["Breakfast", "Lunch", "Snacks", "Dinner"],
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price must be at least 0"],
    },
  },
  { _id: false }
);

// Addon booking schema
const addonBookingSchema = new Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    kitchenId: {
      type: Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    addons: {
      type: [addonItemSchema],
      required: true,
    },
    grandTotalPrice: {
      type: Number,
      required: true,
      min: [0, "Grand total must be at least 0"],
    },
    bookingDate: {
      type: Date,
      default: Date.now, // The date the addon is booked for
    },
    deliveredDate: {
      type: Date,
      default: null,
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Delivered"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

addonBookingSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = `0${now.getMonth() + 1}`.slice(-2);

      let counter = await DatabaseCounter.findOneAndUpdate(
        {
          type: "Addon",
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!counter) {
        throw new Error("Counter document could not be created or updated.");
      }

      const customId = `HVNS-OA${year}${month}${counter.count}`;
      this.orderId = customId;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Index for performance when filtering by userId, propertyId, and status
addonBookingSchema.index({ userId: 1, bookingDate: -1 });
addonBookingSchema.index({ propertyId: 1, addonId: 1, bookingDate: -1 });
addonBookingSchema.index({ status: 1 });

export const AddonBooking = mongoose.model("AddonBooking", addonBookingSchema);
