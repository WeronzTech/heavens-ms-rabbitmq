import mongoose from "mongoose";

const queuedInventorySchema = new mongoose.Schema(
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
      default: "piece",
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
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
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    linkedInventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "applied", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const QueuedInventory = mongoose.model(
  "QueuedInventory",
  queuedInventorySchema
);

export default QueuedInventory;
