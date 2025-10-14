import mongoose from "mongoose";

const gamingItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Available", "OutOfStock"],
      default: "Available",
    },
    itemImage: {
      type: String, // URL to the image after upload
      required: false,
    },
  },
  { timestamps: true }
);

const GamingItem = mongoose.model("GamingItem", gamingItemSchema);

export default GamingItem;
