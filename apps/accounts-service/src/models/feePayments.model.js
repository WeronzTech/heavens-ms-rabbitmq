import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rentType: { type: String, required: true },
    userType: { type: String, required: true },
    contact: { type: String, required: true },
    room: { type: String, required: true },
    rent: { type: Number, required: true },
    amount: { type: Number, required: true }, // Payment amount
    dueAmount: { type: Number, required: false }, // Remaining pending amount
    waveOffAmount: { type: Number, required: false },
    referralAmountUsed: { type: Number, required: false },
    waveOffReason: { type: String, required: false },
    accountBalance: { type: Number, required: true },
    advanceApplied: { type: Number, default: 0 }, // How much credit was used for this payment
    remainingBalance: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card", "Razorpay"],
      required: true,
    },
    transactionId: {
      type: String,
      required: function () {
        return (
          this.paymentMethod === "UPI" || this.paymentMethod === "Bank Transfer"
        );
      }, // Only required for UPI and Online payments
      sparse: true, // Allow null for manual payments (Cash and Bank Transfer)
    },
    collectedBy: { type: String, required: false },
    fullyClearedRentMonths: [{ type: String, required: true }], // Example: "January 2024"
    paymentForMonths: [{ type: String }],
    advanceForMonths: [{ type: String }],
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
    remarks: { type: String },
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
    receiptNumber: { type: String },
    razorpayOrderId: { type: String }, // Store Razorpay order ID
    razorpayPaymentId: { type: String }, // Store transaction ID
    razorpaySignature: { type: String }, // For verifying payment
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
    }, // Link to the client
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

const Payments = mongoose.model("Payments", paymentSchema);
export default Payments;
