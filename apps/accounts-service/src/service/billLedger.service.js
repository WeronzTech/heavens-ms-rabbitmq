// ⭐️ --- START UPDATE ---
// This is a NEW FILE for Bill-wise (AR/AP) reports.
import BillLedger from "../models/billLedger.model.js";
import ChartOfAccount from "../models/chartOfAccounts.model.js";
import mongoose from "mongoose";

/**
 * Gets all outstanding (Pending) bills, grouped by Party (Account).
 * @param {object} filters - { propertyId, accountType: 'Asset' (AR) or 'Liability' (AP) }
 */
export const getOutstandingBills = async (filters) => {
  const { propertyId, accountType } = filters;

  if (!accountType || !["Asset", "Liability"].includes(accountType)) {
    return {
      success: false,
      status: 400,
      message: "accountType (Asset for AR, Liability for AP) is required.",
    };
  }

  try {
    // Find all AR/AP accounts that maintain bill-wise
    const accounts = await ChartOfAccount.find({
      accountType: accountType,
      maintainsBillWise: true,
    })
      .select("_id name")
      .lean();

    const accountIds = accounts.map((a) => a._id);

    const match = {
      accountId: { $in: accountIds },
      status: "Pending",
      ...(propertyId && {
        propertyId: new mongoose.Types.ObjectId(propertyId),
      }),
    };

    const outstandingBills = await BillLedger.aggregate([
      { $match: match },
      { $sort: { dueDate: 1 } },
      {
        $group: {
          _id: "$accountId",
          pendingAmount: { $sum: "$pendingAmount" },
          bills: { $push: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "chartofaccounts",
          localField: "_id",
          foreignField: "_id",
          as: "accountDetails",
        },
      },
      { $unwind: "$accountDetails" },
      {
        $project: {
          accountId: "$_id",
          accountName: "$accountDetails.name",
          totalPending: "$pendingAmount",
          bills: 1,
        },
      },
      { $sort: { accountName: 1 } },
    ]);

    return { success: true, status: 200, data: outstandingBills };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

/**
 * Gets the detailed history of a single bill (NewRef and all AgainstRefs).
 * @param {object} filters - { accountId, billRefNo }
 */
export const getBillDetails = async (filters) => {
  const { accountId, billRefNo } = filters;

  if (!accountId || !billRefNo) {
    return {
      success: false,
      status: 400,
      message: "accountId and billRefNo are required.",
    };
  }

  try {
    const billTransactions = await JournalEntry.find({
      "transactions.accountId": new mongoose.Types.ObjectId(accountId),
      "transactions.billReference.refNo": billRefNo,
    })
      .populate("transactions.accountId", "name")
      .sort({ date: 1 })
      .lean();

    if (!billTransactions.length) {
      return {
        success: false,
        status: 404,
        message: "No transactions found for this bill reference.",
      };
    }

    return { success: true, status: 200, data: billTransactions };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};
// ⭐️ --- END UPDATE ---
