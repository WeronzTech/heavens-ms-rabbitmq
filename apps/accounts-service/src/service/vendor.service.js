import mongoose from "mongoose";
import Vendor from "../models/vendor.model.js";
import Expense from "../models/expense.model.js";

export const addVendor = async (data) => {
  try {
    const { vendorName, mobileNumber, vendorType, clientId, addedBy } = data;
    console.log("Dta", data);

    if (!vendorName || !clientId) {
      return {
        success: false,
        status: 400,
        message:
          "Missing required fields: vendorName and clientId are required",
      };
    }

    const newVendor = new Vendor({
      vendorName,
      mobileNumber,
      vendorType,
      clientId,
      addedBy,
    });

    await newVendor.save();
    return {
      success: true,
      status: 201,
      message: "Vendor created successfully",
      data: newVendor,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error adding vendor:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

export const editVendor = async (data) => {
  try {
    const { vendorId, vendorName, mobileNumber, vendorType, status } = data;

    if (!vendorId) {
      return { success: false, status: 400, message: "Vendor ID is required" };
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { vendorName, mobileNumber, vendorType, status },
      { new: true },
    );

    if (!updatedVendor) {
      return { success: false, status: 404, message: "Vendor not found" };
    }

    return {
      success: true,
      status: 200,
      message: "Vendor updated successfully",
      data: updatedVendor,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error editing vendor:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

export const getAllVendors = async (data) => {
  try {
    const { clientId } = data;
    if (!clientId) {
      return { success: false, status: 400, message: "Client ID is required" };
    }

    const vendors = await Vendor.find({
      clientId: new mongoose.Types.ObjectId(clientId),
    }).sort({ createdAt: -1 });

    return { success: true, status: 200, data: vendors };
  } catch (error) {
    console.error("[ACCOUNTS] Error getting all vendors:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

export const getVendorSummary = async (data) => {
  try {
    const { vendorId } = data;
    if (!vendorId) {
      return { success: false, status: 400, message: "Vendor ID is required" };
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return { success: false, status: 404, message: "Vendor not found" };
    }

    const expenses = await Expense.find({
      vendorId: new mongoose.Types.ObjectId(vendorId),
    }).sort({ date: -1 });

    const totalPaid = expenses
      .filter((e) => e.status === "paid")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPending = expenses
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      success: true,
      status: 200,
      data: {
        vendor,
        expenses,
        totalPaid,
        totalPending,
      },
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error getting vendor summary:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};
