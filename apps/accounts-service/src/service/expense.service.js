import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import Expense from "../models/expense.model.js";

export const addExpense = async (data) => {
  try {
    const {
      transactionId,
      property,
      paymentMethod,
      amount,
      handledBy,
      pettyCashType,
      ...expenseData
    } = data;

    // ✅ Required field validation
    if (
      !property?.id ||
      !property?.name ||
      !paymentMethod ||
      !amount ||
      !expenseData.title ||
      !expenseData.type ||
      !expenseData.category ||
      !expenseData.date
    ) {
      return { success: false, status: 400, message: "Missing required fields" };
    }

    // ✅ Additional validation for petty cash type
    if (paymentMethod === "Petty Cash" && !pettyCashType) {
      return {
        success: false,
        status: 400,
        message: "Petty cash type (inHand/inAccount) is required",
      };
    }

    // ✅ Handle Petty Cash validation & deduction
    if (paymentMethod === "Petty Cash") {
      const pettyCashResponse = await sendRPCRequest(
        CLIENT_PATTERN.PETTYCASH.GET_PETTYCASH_BY_MANAGER,
        { managerId: handledBy }
      );

      if (!pettyCashResponse?.success || !pettyCashResponse.data) {
        return {
          success: false,
          status: 400,
          message: "No petty cash found for this manager",
        };
      }

      const pettyCash = pettyCashResponse.data;

      if (pettyCashType === "inHand" && pettyCash.inHandAmount < amount) {
        return {
          success: false,
          status: 400,
          message: "Insufficient in-hand petty cash balance",
        };
      }

      if (pettyCashType === "inAccount" && pettyCash.inAccountAmount < amount) {
        return {
          success: false,
          status: 400,
          message: "Insufficient in-account petty cash balance",
        };
      }

      // ✅ Deduct petty cash (send negative amount)
      await sendRPCRequest(CLIENT_PATTERN.PETTYCASH.ADD_PETTYCASH, {
        managerId: handledBy,
        pettyCashType,
        amount: -amount, // 👈 deduct instead of add
      });
    }

    // ✅ Create expense in DB
    const expense = new Expense({
      transactionId,
      property,
      handledBy,
      paymentMethod,
      pettyCashType: paymentMethod === "Petty Cash" ? pettyCashType : undefined,
      amount,
      ...expenseData,
    });

    await expense.save();

    return {
      success: true,
      status: 201,
      message: "Expense added successfully",
      data: expense,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in addExpense:", error);
    return {
      success: false,
      status: 500,
      message: "An internal server error occurred while adding expense.",
      error: error.message,
    };
  }
};
