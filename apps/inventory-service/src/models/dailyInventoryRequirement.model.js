import mongoose from "mongoose";

const dailyRequirementItemSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantityRequired: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true, // This should be the base unit (g, ml, etc.)
    },
  },
  { _id: false }
);

const dailyInventoryRequirementSchema = new mongoose.Schema(
  {
    kitchenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    items: {
      type: [dailyRequirementItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved"],
      default: "Pending",
    },
    generatedBy: {
      type: String,
      default: "System Automation",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure we can easily find requirements for a specific kitchen and date
dailyInventoryRequirementSchema.index({ kitchenId: 1, date: 1, status: 1 });

const DailyInventoryRequirement = mongoose.model(
  "DailyInventoryRequirement",
  dailyInventoryRequirementSchema
);

export default DailyInventoryRequirement;
