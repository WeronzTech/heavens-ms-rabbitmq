import mongoose, { Schema } from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Ensure unique account names
    },
    // The fundamental type of account
    accountType: {
      type: String,
      required: true,
      enum: ["Asset", "Liability", "Equity", "Income", "Expense"],
      index: true,
    },
    // Link to a category for grouping
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "AccountCategory",
      required: false, // Make it optional if some accounts don't need categorization initially
      index: true,
    },
    // For tracking GST specifically
    gstType: {
      type: String,
      enum: [
        "GST-Input-CGST",
        "GST-Input-SGST",
        "GST-Input-IGST",
        "GST-Output-CGST",
        "GST-Output-SGST",
        "GST-Output-IGST",
        "Not-Applicable",
      ],
      default: "Not-Applicable",
      index: true,
    },
    // Primarily for Income accounts for GST calculation on sales
    gstRate: {
      type: String,
      enum: [
        "Exempt",
        "Nil-Rated",
        "Taxable-5",
        "Taxable-12",
        "Taxable-18",
        "Taxable-28",
        "Not-Applicable",
      ],
      default: "Not-Applicable",
      index: true,
    },
    // Current balance of the account
    balance: {
      type: Number,
      default: 0,
      // Consider adding validation or custom setters/getters if needed
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // You might add a 'propertyId' if accounts are specific to properties,
    // or keep it general if the Chart of Accounts is global.
    // propertyId: { type: Schema.Types.ObjectId, ref: 'Property', index: true }
  },
  { timestamps: true }
);

// Optional: Add pre-save hook for validation if needed
// accountSchema.pre('save', function(next) {
//   // Example validation: Ensure GST Type makes sense for Account Type
//   if (this.gstType !== 'Not-Applicable' && !['Asset', 'Liability'].includes(this.accountType)) {
//       return next(new Error(`gstType ${this.gstType} is only applicable for Asset or Liability accounts.`));
//   }
//   if (this.gstRate !== 'Not-Applicable' && this.accountType !== 'Income') {
//        return next(new Error(`gstRate is only applicable for Income accounts.`));
//   }
//   next();
// });

const ChartOfAccount = mongoose.model("ChartOfAccount", accountSchema);
export default ChartOfAccount;
