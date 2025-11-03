import mongoose from "mongoose";

const receiptCounterSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  monthYear: { type: String, required: true }, // e.g., "2025-10"
  sequence: { type: Number, default: 0 },
});

receiptCounterSchema.index({ propertyId: 1, monthYear: 1 }, { unique: true });

const ReceiptCounter = mongoose.model("ReceiptCounter", receiptCounterSchema);

export default ReceiptCounter;
