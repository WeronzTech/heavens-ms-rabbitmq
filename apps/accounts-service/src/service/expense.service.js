import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import Expense from "../models/expense.model.js";
import ExpenseCategory from "../models/expenseCategory.model.js";

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
      return {
        success: false,
        status: 400,
        message: "Missing required fields",
      };
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

export const getAllExpenses = async () => {
  try {
    // you can extend later (filters, pagination) using data
    const expenses = await Expense.find().sort({ createdAt: -1 });
    return { success: true, status: 200, data: expenses };
  } catch (error) {
    console.error("[ACCOUNTS] Error in getAllExpenses:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

// Get Expense by ID
export const getExpenseById = async (data) => {
  try {
    const { expenseId } = data;

    if (!expenseId) {
      return { success: false, status: 400, message: "Expense ID is required" };
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return { success: false, status: 404, message: "Expense not found" };
    }

    return { success: true, status: 200, data: expense };
  } catch (error) {
    console.error("[ACCOUNTS] Error in getExpenseById:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

// Delete Expense
export const deleteExpense = async (data) => {
  try {
    const { expenseId } = data;

    if (!expenseId) {
      return { success: false, status: 400, message: "Expense ID is required" };
    }

    const expense = await Expense.findByIdAndDelete(expenseId);
    if (!expense) {
      return { success: false, status: 404, message: "Expense not found" };
    }

    return {
      success: true,
      status: 200,
      message: "Expense deleted successfully",
      data: expense,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in deleteExpense:", error);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
      error: error.message,
    };
  }
};

export const addExpenseCategory = async (data) => {
  try {
    const { mainCategory, subCategory } = data;

    const existing = await ExpenseCategory.findOne({
      mainCategory,
      subCategory: { $regex: new RegExp(`^${subCategory}$`, "i") },
    });

    if (existing) {
      return {
        success: false,
        status: 400,
        message: `Subcategory "${subCategory}" already exists under "${mainCategory}".`,
      };
    }
    const expenseCategory = await ExpenseCategory.create({
      mainCategory,
      subCategory,
    });

    return {
      success: true,
      status: 200,
      message: "Expense category added successfully.",
      data: expenseCategory,
    };
  } catch (error) {
    console.error("Error in addExpenseCategory service:", error);
    return {
      success: false,
      status: 500,
      message:
        "An internal server error occurred while adding expenseCategory.",
      error: error.message,
    };
  }
};

export const getCategoryByMainCategory = async (data) => {
  try {
    const { mainCategory } = data;

    if (!mainCategory) {
      return {
        success: false,
        status: 400,
        message: "Main category is required",
      };
    }

    // ✅ Query DB instead of recursive call
    const categories = await ExpenseCategory.find({ mainCategory });

    return {
      success: true,
      status: 200,
      data: categories,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in getCategoryByMainCategory:", error);
    return {
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching categories by main category.",
      error: error.message,
    };
  }
};

export const getAllCategories = async () => {
  try {
    const categories = await ExpenseCategory.find().lean(); // fetch all categories from DB

    return {
      success: true,
      status: 200,
      data: categories,
    };
  } catch (error) {
    console.error("[ACCOUNTS] Error in getAllCategories:", error);
    return {
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching all categories.",
      error: error.message,
    };
  }
};

export const deleteCategory = async (data) => {
  try {
    const { categoryId } = data;

    await ExpenseCategory.findByIdAndDelete(categoryId);

    return {
      success: true,
      status: 200,
      message: "Category deleted successfully.",
    };
  } catch (error) {
    console.error("Error in deleteCategory service:", error);
    return {
      success: false,
      status: 500,
      message: "An internal server error occurred while deleting category.",
      error: error.message,
    };
  }
};
