import mongoose from "mongoose";
import Expense from "../models/expense.model.js";
import Commission from "../models/commission.model.js";
import Payments from "../models/feePayments.model.js";
import Deposits from "../models/depositPayments.model.js";
import BusPayments from "../models/busPayments.model.js";
import StaffSalaryHistory from "../models/staffSalaryHistory.model.js";

/**
 * Escapes special regex characters
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Checks across all Accounts models whether a transactionId has already been recorded.
 * Runs read-only queries independently outside any write session to ensure fast parallel
 * execution without violating MongoDB's rule against concurrent operations on a single ClientSession.
 *
 * @param {string} rawTransactionId - The transaction ID to check
 * @param {Object} [options]
 * @param {string} [options.excludeModelName] - The model name being updated (e.g. 'Expense', 'Commission', 'Payments', 'Deposits', 'BusPayments', 'StaffSalaryHistory')
 * @param {string|mongoose.Types.ObjectId} [options.excludeId] - The document _id to exclude from the check (self-exclusion)
 * @returns {Promise<{ isDuplicate: boolean, source?: string, recordId?: any, message?: string }>}
 */
export const checkDuplicateTransactionId = async (
  rawTransactionId,
  { excludeModelName = null, excludeId = null } = {},
) => {
  if (!rawTransactionId || typeof rawTransactionId !== "string") {
    return { isDuplicate: false };
  }

  const transactionId = rawTransactionId.trim();
  if (!transactionId) {
    return { isDuplicate: false };
  }

  const regex = new RegExp(`^${escapeRegex(transactionId)}$`, "i");

  const registry = [
    { model: Expense, name: "Expense", label: "Expense" },
    { model: Commission, name: "Commission", label: "Commission" },
    { model: Payments, name: "Payments", label: "Fee Payment" },
    { model: Deposits, name: "Deposits", label: "Deposit Payment" },
    { model: BusPayments, name: "BusPayments", label: "Bus Payment" },
    {
      model: StaffSalaryHistory,
      name: "StaffSalaryHistory",
      label: "Staff Salary / Payroll",
    },
  ];

  const checkPromises = registry.map(async ({ model, name, label }) => {
    const filter = { transactionId: regex };

    if (excludeModelName && excludeModelName === name && excludeId) {
      filter._id = { $ne: excludeId };
    }

    const match = await model.findOne(filter).select("_id transactionId").lean();
    if (match) {
      return { matched: true, label, recordId: match._id };
    }
    return null;
  });

  const results = await Promise.all(checkPromises);
  const found = results.find((res) => res && res.matched);

  if (found) {
    return {
      isDuplicate: true,
      source: found.label,
      recordId: found.recordId,
      message: `Transaction ID "${transactionId}" already exists in ${found.label}.`,
    };
  }

  return { isDuplicate: false };
};
