import mongoose from "mongoose";

const propertyLogSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId },
    action: {
      type: String,
      required: true,
      enum: ["create", "update", "delete", "active_status", "inactive_status"],
    },
    category: {
      type: String,
      required: true,
      enum: ["property", "staff", "room"],
    },
    changedByName: {
      type: String,
      required: true,
    },
    message: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const PropertyLog = mongoose.model("PropertyLog", propertyLogSchema);

export default PropertyLog;
