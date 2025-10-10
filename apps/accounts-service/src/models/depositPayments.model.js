import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    userType: {
      type: String,
      enum: ["student", "worker"],
      required: true,
    },
    isRefund: { type: Boolean, default: false, required: true },

    // Deposit Collection Fields // isRefund = false
    nonRefundableDeposit: { type: Number, default: 0 },
    refundableDeposit: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card", "Razorpay"],
    },
    transactionId: {
      type: String,
      required: function () {
        return (
          this.paymentMethod === "UPI" || this.paymentMethod === "Bank Transfer"
        );
      },
      sparse: true,
    },
    collectedBy: { type: String },
    paymentDate: { type: Date, default: Date.now },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    status: {
      type: String,
      enum: ["Paid", "Pending", "Refunded"],
      default: "Pending",
    },

    // Refund Fields // isRefund = true
    handledBy: { type: String },

    remarks: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    property: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

const Deposits = mongoose.model("deposits", depositSchema);
export default Deposits;
