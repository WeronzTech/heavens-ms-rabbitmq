import mongoose from "mongoose";

const accountCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    // This helps in filtering categories in the UI
    // e.g., Show "Utilities" & "Payroll" only when "Expense" account type is selected
    accountType: {
      type: String,
      required: true,
      enum: ["Asset", "Liability", "Equity", "Income", "Expense"],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountCategory",
      default: null, // A null parent means it's a top-level category
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const AccountCategory = mongoose.model(
  "AccountCategory",
  accountCategorySchema
);
export default AccountCategory;
