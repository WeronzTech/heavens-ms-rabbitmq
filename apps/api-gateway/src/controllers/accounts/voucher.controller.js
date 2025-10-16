import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";
import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";

export const addVoucherController = async (req, res) => {
  try {
    const { recipientName, purpose, amount, date, createdBy } = req.body;

    const Voucher = await sendRPCRequest(ACCOUNTS_PATTERN.VOUCHER.ADD_VOUCHER, {
      recipientName,
      purpose,
      amount,
      date,
      createdBy,
    });

    if (Voucher.status === 200) {
      res.status(200).json(Voucher);
    } else {
      res.status(Voucher.status).json(Voucher);
    }
  } catch (error) {
    console.error("Error in adding Voucher:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while adding Voucher.",
    });
  }
};

export const deleteVoucherController = async (req, res) => {
  try {
    const { voucherId } = req.params;

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.VOUCHER.DELETE_VOUCHER,
      { voucherId, deletedBy: req.userAuth }
    );

    res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("Error in deleting Voucher:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while deleting Voucher.",
    });
  }
};

export const getVoucherByPropertyController = async (req, res) => {
  try {
    const { status, search, month, year } = req.query;

    // If query is not given, send an empty object to fetch all
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.VOUCHER.GET_VOUCHER_BY_PROPERTY,
      { status, search, month, year }
    );

    res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("Error in fetching vouchers by property:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while fetching vouchers.",
    });
  }
};
