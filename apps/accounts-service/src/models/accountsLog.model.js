import mongoose from "mongoose";

const accountsLogSchema = new mongoose.Schema(
  {
    logType: {
      type: String,
      required: true,
      enum: [
        "Commission",
        "Deposit",
        "Expense",
        "Fee Payment",
        "Salary",
        "Voucher",
      ],
    },
    action: {
      type: String,
      required: true,
      enum: ["Create", "Update", "Delete", "Payment", "Refund"],
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
    performedBy: {
      type: String, // Can be a user ID or a system process name like "Cron Job"
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId, // The ID of the document that was created/updated (e.g., Payment ID, Expense ID)
      required: true,
    },
  },
  { timestamps: true }
);

accountsLogSchema.index({ logType: 1, action: 1 });
accountsLogSchema.index({ propertyId: 1, createdAt: -1 });

const AccountsLog = mongoose.model("AccountsLog", accountsLogSchema);

export default AccountsLog;
