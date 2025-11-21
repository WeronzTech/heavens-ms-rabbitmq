import mongoose from "mongoose";

const deliveryChargeSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant", // Adjust 'Merchant' to match your actual Merchant model name if different
      required: true,
    },
    handlingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryCharge: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const DeliveryCharge = mongoose.model("DeliveryCharge", deliveryChargeSchema);
export default DeliveryCharge;
