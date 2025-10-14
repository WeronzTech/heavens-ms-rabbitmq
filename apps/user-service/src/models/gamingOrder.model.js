import mongoose from "mongoose";

const gamingOrderSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GamingItem",
      required: true,
    },
    userId: {
      // Assuming you have a user ID from your auth middleware
      type: String,
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    discountApplied: {
      type: Number,
      required: true,
      default: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    paymentDetails: {
      paymentId: { type: String },
      orderId: { type: String },
      signature: { type: String },
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Success", "Failed"],
      default: "Pending",
    },
    deliveryStatus: {
      type: String,
      enum: ["Pending", "Delivered"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const GamingOrder = mongoose.model("GamingOrder", gamingOrderSchema);

export default GamingOrder;
