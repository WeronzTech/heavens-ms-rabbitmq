import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    recipientName: { type: String, required: true },
    purpose: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    createdBy: { type: String },

    //expenses recorded against this voucher
    totalExpenseAmount: { type: Number, default: 0 },
    remainingAmount: {
      type: Number,
      default: function () {
        return this.amount;
      },
    },
    status: {
      type: String,
      enum: ["Pending", "Fully Utilized"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const Voucher = mongoose.model("Voucher", voucherSchema);

export default Voucher;
