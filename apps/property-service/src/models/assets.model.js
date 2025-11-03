import { Schema, model } from "mongoose";
import DatabaseCounter from "./databaseCounter.model.js";

const AssetSchema = new Schema(
  {
    assetId: {
      type: String,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "AssetCategory", // <-- This references your new model
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property", // Assumes you have a 'Property' model
      required: true,
    },
    floorId: {
      type: Schema.Types.ObjectId,
      ref: "Floor", // Assumes you have a 'Floor' model
      required: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room", // Assumes you have a 'Room' model
      required: true,
    },
    // PurchaseDetails are defined directly in the schema
    purchaseDetails: {
      purchaseDate: { type: Date, required: true },
      vendor: { type: String, required: true, trim: true },
      price: { type: Number, required: true },
      invoiceUrl: { type: String, trim: true },
    },
    // WarrantyDetails are defined directly in the schema
    warrantyDetails: {
      provider: { type: String, required: false, trim: true },
      expiryDate: { type: Date, required: false },
      notes: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ["Active", "In-Repair", "Retired", "Sold", "In Inventory"],
      default: "Active",
    },
    // Details for when the item is sold
    soldDetails: {
      soldDate: { type: Date },
      buyer: { type: String, trim: true },
      price: { type: Number },
      notes: { type: String, trim: true },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Add an index for faster searching by location
AssetSchema.index({ propertyId: 1, floorId: 1, roomId: 1 });

AssetSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = `0${now.getMonth() + 1}`.slice(-2);

      let counter = await DatabaseCounter.findOneAndUpdate(
        {
          type: "Asset",
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!counter) {
        throw new Error("Counter document could not be created or updated.");
      }

      const customId = `HVNS-AST${year}${month}${counter.count}`;
      this.assetId = customId;
    }
    next();
  } catch (error) {
    next(error);
  }
});

export const Asset = model("Asset", AssetSchema);
