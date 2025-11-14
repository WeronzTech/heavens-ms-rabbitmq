// ⭐️ --- START UPDATE ---
// This is a NEW FILE for tracking bill-wise details (AR/AP).
import mongoose, { Schema } from "mongoose";

/**
 * This model tracks individual bills for accounts that have 'maintainsBillWise' set to true
 * (e.g., Accounts Receivable, Accounts Payable).
 */
const billLedgerSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
      index: true,
    },
    journalEntryId: {
      type: Schema.Types.ObjectId,
      ref: "JournalEntry",
      required: true,
    },
    billRefNo: {
      type: String,
      required: true,
      trim: true,
    },
    billDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
    },
    totalAmount: {
      type: Number, // The original amount of the bill
      required: true,
    },
    pendingAmount: {
      type: Number, // The outstanding amount
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Cleared"],
      default: "Pending",
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

// Compound index for efficient querying of outstanding bills
billLedgerSchema.index({ accountId: 1, status: 1, billRefNo: 1 });

const BillLedger = mongoose.model("BillLedger", billLedgerSchema);
export default BillLedger;
// ⭐️ --- END UPDATE ---
