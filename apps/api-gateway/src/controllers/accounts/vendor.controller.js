import {sendRPCRequest} from "../../../../../libs/common/rabbitMq.js";
import {ACCOUNTS_PATTERN} from "../../../../../libs/patterns/accounts/accounts.pattern.js";

export const addVendor = async (req, res) => {
  try {
    const result = await sendRPCRequest(ACCOUNTS_PATTERN.VENDOR.ADD_VENDOR, {
      ...req.body,
      clientId: req.clientId,
    });
    res.status(result.status || 200).json(result);
  } catch (error) {
    console.error("Error adding vendor:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const editVendor = async (req, res) => {
  try {
    const result = await sendRPCRequest(ACCOUNTS_PATTERN.VENDOR.EDIT_VENDOR, {
      ...req.body,
      clientId: req.clientId,
    });
    res.status(result.status || 200).json(result);
  } catch (error) {
    console.error("Error editing vendor:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllVendors = async (req, res) => {
  try {
    const result = await sendRPCRequest(ACCOUNTS_PATTERN.VENDOR.GET_ALL_VENDORS, {
      clientId: req.clientId,
      ...req.query,
    });
    res.status(result.status || 200).json(result);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getVendorSummary = async (req, res) => {
  try {
    const result = await sendRPCRequest(ACCOUNTS_PATTERN.VENDOR.GET_VENDOR_SUMMARY, {
      vendorId: req.params.vendorId,
      clientId: req.clientId,
    });
    res.status(result.status || 200).json(result);
  } catch (error) {
    console.error("Error fetching vendor summary:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
