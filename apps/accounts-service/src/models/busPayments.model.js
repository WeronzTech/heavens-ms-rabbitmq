import mongoose from "mongoose";

const busPaymentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    userType: {
      type: String,
      enum: ["student", "worker"],
      required: true,
    },
    contact: { type: String, required: true },

    // Deposit Collection Fields // isRefund = false
    busFee: { type: Number, default: 0 },
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
      enum: ["Paid", "Pending"],
      default: "Pending",
    },

    remarks: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    property: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
      _id: false,
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const BusPayments = mongoose.model("BusPayments", busPaymentSchema);
export default BusPayments;
