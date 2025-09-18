import mongoose from "mongoose";

const usageForPreparationSchema = new mongoose.Schema(
  {
    kitchenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
      index: true,
    },
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantityUsed: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      // This should be the base unit used for calculations, e.g., g, ml
    },
    preparationDate: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

usageForPreparationSchema.index({ kitchenId: 1, preparationDate: 1 });

export const UsageForPreparation = mongoose.model(
  "UsageForPreparation",
  usageForPreparationSchema
);
