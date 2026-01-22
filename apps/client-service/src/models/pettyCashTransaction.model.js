import mongoose from "mongoose";

const pettyCashTransactionSchema = new mongoose.Schema(
  {
    pettyCash: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PettyCash",
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
    },
    managerName: { type: String, required: true },

    inHandAmount: { type: Number, default: 0 },
    inAccountAmount: { type: Number, default: 0 },

    balanceAfter: {
      inHandAmount: Number,
      inAccountAmount: Number,
    },

    paymentMode: { type: String },
    date: { type: Date },
    transactionId: { type: String },
    notes: { type: String },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceType: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    createdbyName: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model(
  "PettyCashTransaction",
  pettyCashTransactionSchema,
);
