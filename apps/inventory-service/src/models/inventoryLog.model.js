import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    kitchenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantityChanged: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    operation: {
      type: String,
      enum: [
        "add",
        "remove",
        "edit",
        "auto_apply_queued",
        "price_update_and_add",
      ],
      required: true,
    },
    editedField: {
      type: String,
      enum: [
        "stockQuantity",
        "lowStockQuantity",
        "quantityType",
        "other",
        "productName",
        "kitchenId",
        "categoryId",
      ],
    },
    notes: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      trim: true,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema);

export default InventoryLog;
