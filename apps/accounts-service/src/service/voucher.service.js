import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import Voucher from "../models/voucher.model.js";
import { createAccountLog } from "./accountsLog.service.js";

export const addVoucher = async (data) => {
  try {
    const { recipientName, purpose, amount, date, createdBy } = data;
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.FEE_PAYMENTS.GET_ALL_CASH_PAYMENTS,
      {}
    );
    console.log(response);
    const netCash = response?.netCash ?? 0;

    // 🔹 Check if enough cash is available
    if (amount > netCash) {
      return {
        success: false,
        status: 400,
        message: `Insufficient cash balance. Available: ₹${netCash}, Requested: ₹${amount}`,
      };
    }

    // Create new voucher
    const newVoucher = await Voucher.create({
      recipientName,
      purpose,
      amount,
      date,
      createdBy,
    });

    await createAccountLog({
      logType: "Voucher",
      action: "Create",
      description: `Voucher of ₹${newVoucher.amount} created for ${newVoucher.recipientName}.`,
      amount: -newVoucher.amount, // Negative as it's a liability/expense
      // propertyId: newVoucher.propertyId,
      performedBy: data.date,
      referenceId: newVoucher._id,
    });

    return {
      success: true,
      status: 201,
      message: "Voucher created successfully.",
      data: newVoucher,
    };
  } catch (error) {
    console.error("Add Voucher Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

export const deleteVoucher = async (data) => {
  try {
    const deletedVoucher = await Voucher.findByIdAndDelete(data.voucherId);

    if (!deletedVoucher) {
      return {
        success: false,
        status: 404,
        message: "Voucher not found.",
      };
    }

    await createAccountLog({
      logType: "Voucher",
      action: "Delete",
      description: `Voucher of ₹${deletedVoucher.amount} for ${deletedVoucher.user} deleted.`,
      amount: 0, // No financial change
      propertyId: deletedVoucher.propertyId,
      performedBy: data.deletedBy || "System", // Assuming a user context isn't passed for deletion
      referenceId: deletedVoucher._id,
    });

    return {
      success: true,
      status: 200,
      message: "Voucher deleted successfully.",
      data: deletedVoucher,
    };
  } catch (error) {
    console.error("Delete Voucher Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

// export const getVoucherByProperty = async (data) => {
//   try {
//     let vouchers;

//     // If propertyId is provided → filter, else fetch all
//     if (data && data.propertyId) {
//       vouchers = await Voucher.find({ propertyId: data.propertyId });
//     } else {
//       vouchers = await Voucher.find({});
//     }

//     if (!vouchers || vouchers.length === 0) {
//       return {
//         success: false,
//         status: 404,
//         message: data?.propertyId
//           ? "No vouchers found for this property."
//           : "No vouchers found.",
//       };
//     }

//     return {
//       success: true,
//       status: 200,
//       message: data?.propertyId
//         ? "Vouchers fetched successfully for the property."
//         : "All vouchers fetched successfully.",
//       data: vouchers,
//     };
//   } catch (error) {
//     console.error("Get Voucher By Property Service Error:", error);
//     return {
//       success: false,
//       status: 500,
//       message: "Internal Server Error",
//       error: error.message,
//     };
//   }
// };

export const getVoucherByProperty = async (data) => {
  try {
    const { status, search, month, year } = data || {};
    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.recipientName = searchRegex;
    }

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      query.date = {
        $gte: startDate,
        $lte: endDate,
      };
    } else if (year && !month) {
      // If only year is provided
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      query.date = {
        $gte: startOfYear,
        $lte: endOfYear,
      };
    }

    // 🔹 Fetch filtered vouchers
    const vouchers = await Voucher.find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    if (!vouchers || vouchers.length === 0) {
      return {
        success: false,
        status: 404,
        message: "No vouchers found.",
      };
    }

    return {
      success: true,
      status: 200,
      message: "All vouchers fetched successfully.",
      total: vouchers.length,
      data: vouchers,
    };
  } catch (error) {
    console.error("Get Voucher Service Error:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};
