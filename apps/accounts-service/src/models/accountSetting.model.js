import mongoose, { Schema } from "mongoose";

/**
 * Defines the mapping between a fixed system function (e.g., "INCOME_RENT_MONTHLY")
 * and a specific account (ledger) from the ChartOfAccount.
 * This allows an admin to dynamically change which account is used for which function
 * without any code changes.
 */
const accountSettingSchema = new Schema(
  {
    // The permanent, hard-coded system name for a function.
    // e.g., "INCOME_RENT_MONTHLY", "CORE_BANK_ACCOUNT"
    systemName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // The user-selected account ID from the ChartOfAccount collection.
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
    },
    // A user-friendly description of what this setting controls.
    description: {
      type: String,
    },
    // Track who last updated this mapping.
    lastUpdatedBy: {
      type: String,
    },
  },
  { timestamps: true }
);

const AccountSetting = mongoose.model("AccountSetting", accountSettingSchema);
export default AccountSetting;
