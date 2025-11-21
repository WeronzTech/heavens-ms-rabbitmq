import mongoose from "mongoose"

// 1. Simplified Item Schema
// Keeps essential details to lock in the price/name at the time of purchase.
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    imageURL: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    variant: { type: String, default: null },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: String,
    phoneNumber: String,
    flat: String,
    area: String,
    landmark: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
    },
  },
  { _id: false }
);

// 3. Main Order Schema
const orderSchema = new mongoose.Schema(
  {
    // --- Users ---
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
    },
    // agent: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Agent",
    //   default: null,
    // },

    // --- Items ---
    items: [orderItemSchema],

    // --- Logistics ---
    deliveryMode: {
      type: String,
      enum: ["Home Delivery"],
      required: true,
      default: "Home Delivery",
    },
    pickupAddress: addressSchema, // Optional: populated from Merchant
    deliveryAddress: addressSchema, // Required: populated from Customer

    // --- Billing ---
    bill: {
      itemTotal: { type: Number, required: true },
      deliveryCharge: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      promoCode: { type: String, default: null },
      grandTotal: { type: Number, required: true },
    },

    // --- Payment ---
    paymentMethod: {
      type: String,
      enum: ["Online"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Pending",
    },
    transactionId: { type: String, default: null },

    // --- Status & Tracking ---
    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Preparing",
        "Out for Delivery",
        "Completed",
      ],
      default: "Pending",
    },

    instructions: { type: String, default: null },
    cancellationReason: { type: String, default: null },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;