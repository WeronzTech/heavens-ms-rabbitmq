import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../../libs/patterns/client/client.pattern.js";

export const addPettyCashController = async (req, res) => {
  try {
    const {
      inHandAmount,
      inAccountAmount,
      manager,
      managerName,
      transactionId,
      date,
      notes,
      createdBy,
      createdByName,
      paymentMode,
    } = req.body;

    const pettyCash = await sendRPCRequest(
      CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH,
      {
        inHandAmount,
        inAccountAmount,
        manager,
        managerName,
        transactionId,
        date,
        notes,
        createdBy,
        createdByName,
        paymentMode,
      },
    );

    if (pettyCash.status === 200) {
      res.status(200).json(pettyCash);
    } else {
      res.status(pettyCash.status).json(pettyCash);
    }
  } catch (error) {
    console.error("Error in add pettycash:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while adding pettycash.",
    });
  }
};

export const getPettyCashController = async (req, res) => {
  try {
    const { propertyId, managerId } = req.query;

    const response = await sendRPCRequest(
      CLIENT_PATTERN.PETTYCASH.GET_PETTYCASH,
      { propertyId, managerId },
    );

    res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("Error fetching petty cash records:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching petty cash records.",
    });
  }
};

export const getPettyCashByManagerController = async (req, res) => {
  try {
    const managerId = req.params.id;

    const response = await sendRPCRequest(
      CLIENT_PATTERN.PETTYCASH.GET_PETTYCASH_BY_MANAGER,
      { managerId }
    );

    res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("Error fetching petty cash by manager:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching petty cash by manager.",
    });
  }
};

export const getPettyCashTransactionsByManagerController = async (req, res) => {
  try {
    const managerId = req.params.id;

    console.log("Manager",managerId)

    const response = await sendRPCRequest(
      CLIENT_PATTERN.PETTYCASH.GET_PETTYCASH_TRANSACTIONS_BY_MANAGER,
      { managerId }
    );
    console.log("Response",response)

    res.status(response?.status || 500).json(response);
  } catch (error) {
    console.error("Error fetching petty cash transactions by manager:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching petty cash transactions by manager.",
    });
  }
};
