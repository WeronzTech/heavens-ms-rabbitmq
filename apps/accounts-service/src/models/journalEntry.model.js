import mongoose, { Schema } from "mongoose";

// This sub-document records one "leg" of a transaction (a debit or a credit)
const transactionSchema = new mongoose.Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
    },
    debit: {
      type: Number,
      default: 0,
      min: 0,
    },
    credit: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const journalEntrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // The array of debits and credits.
    transactions: [transactionSchema],
    propertyId: {
      type: Schema.Types.ObjectId,
    },
    // Link to the original document (e.g., the FeePayment, Expense) for reference
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    referenceType: {
      type: String,
      // e.g., "FeePayment", "Expense", "StaffSalaryHistory", "RazorpayPayment"
    },
    // Who created this entry
    performedBy: {
      type: String, // Can be a User ID or name
    },
  },
  { timestamps: true }
);

// Validation to ensure every journal entry is balanced
journalEntrySchema.pre("save", function (next) {
  const totalDebits = this.transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredits = this.transactions.reduce((sum, t) => sum + t.credit, 0);

  // Use a small tolerance for floating point comparisons
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    next(
      new Error("Journal entry is unbalanced: Debits do not equal Credits.")
    );
  } else if (totalDebits === 0) {
    next(new Error("Journal entry must have a non-zero value."));
  } else {
    next();
  }
});

const JournalEntry = mongoose.model("JournalEntry", journalEntrySchema);
export default JournalEntry;
