import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";
import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";

export const addVoucherController = async (req, res) => {
  try {
    const { user, description, createdBy, amount, propertyId, propertyName } =
      req.body;

    const Voucher = await sendRPCRequest(ACCOUNTS_PATTERN.VOUCHER.ADD_VOUCHER, {
      user,
      description,
      createdBy,
      amount,
      propertyId,
      propertyName,
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
