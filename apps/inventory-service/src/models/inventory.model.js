import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantityType: {
      type: String,
      required: true,
      enum: ["kg", "g", "l", "ml"],
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    kitchenId: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Kitchen",
          required: true,
        },
      ],
      validate: {
        validator: function (value) {
          const stringIds = value.map((id) => id.toString());
          return new Set(stringIds).size === stringIds.length;
        },
        message: "Duplicate kitchenId values are not allowed.",
      },
      index: true,
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
