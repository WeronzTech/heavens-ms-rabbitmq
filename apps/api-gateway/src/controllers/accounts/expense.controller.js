import { sendRPCRequest } from "../../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../../libs/patterns/accounts/accounts.pattern.js";

export const addExpenseController = async (req, res) => {
  try {
    const {
      transactionId,
      property,
      paymentMethod,
      amount,
      handledBy,
      pettyCashType,
      ...expenseData
    } = req.body;

    if (req.files?.billImage?.[0]) {
      expenseData.billImage = {
        buffer: req.files.billImage[0].buffer.toString("base64"),
        originalname: req.files.billImage[0].originalname,
        mimetype: req.files.billImage[0].mimetype,
      };
    }

    const expense = await sendRPCRequest(ACCOUNTS_PATTERN.EXPENSE.ADD_EXPENSE, {
      transactionId,
      property,
      paymentMethod,
      amount,
      handledBy,
      pettyCashType,
      ...expenseData,
    });

    if (expense.status === 200) {
      res.status(200).json(expense);
    } else {
      res.status(expense.status).json(expense);
    }
  } catch (error) {
    console.error("Error in adding expense:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while adding expense.",
    });
  }
};

// Get All Expenses
export const getAllExpensesController = async (req, res) => {
  try {
    const expenses = await sendRPCRequest(
      ACCOUNTS_PATTERN.EXPENSE.GET_ALL_EXPENSES,
      {}
    );
    res.status(expenses.status || 500).json(expenses);
  } catch (error) {
    console.error("Error in fetching expenses:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while fetching expenses.",
    });
  }
};

// Get Expense By ID
export const getExpenseByIdController = async (req, res) => {
  try {
    const { expenseId } = req.params;

    if (!expenseId) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Expense ID is required",
      });
    }

    const expense = await sendRPCRequest(
      ACCOUNTS_PATTERN.EXPENSE.GET_EXPENSE_BY_ID,
      { expenseId }
    );
    res.status(expense.status || 500).json(expense);
  } catch (error) {
    console.error("Error in fetching expense by ID:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while fetching the expense.",
    });
  }
};

// Delete Expense
export const deleteExpenseController = async (req, res) => {
  try {
    const { expenseId } = req.params;

    if (!expenseId) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Expense ID is required",
      });
    }

    const expense = await sendRPCRequest(
      ACCOUNTS_PATTERN.EXPENSE.DELETE_EXPENSE,
      { expenseId }
    );
    res.status(expense.status || 500).json(expense);
  } catch (error) {
    console.error("Error in deleting expense:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while deleting the expense.",
    });
  }
};

export const addExpenseCategoryController = async (req, res) => {
  try {
    const { mainCategory, subCategory } = req.body;

    const expenseCategory = await sendRPCRequest(
      ACCOUNTS_PATTERN.EXPENSE.ADD_EXPENSE_CATEGORY,
      {
        mainCategory,
        subCategory,
      }
    );

    if (expenseCategory.status === 200) {
      res.status(200).json(expenseCategory);
    } else {
      res.status(expense.status).json(expenseCategory);
    }
  } catch (error) {
    console.error("Error in adding expenseCategory:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message:
        "An internal server error occurred while adding expenseCategory.",
    });
  }
};

export const getCategoryByMainCategoryController = async (req, res) => {
  try {
    const { mainCategory } = req.body;

    if (!mainCategory) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Main category is required",
      });
    }

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.EXPENSE.GET_CATEGORY_BY_MAINCATEROGY,
      { mainCategory }
    );

    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("Error in getCategoryByMainCategoryController:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching categories by main category.",
    });
  }
};
export const getAllCategoriesController = async (req, res) => {
  try {
    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.EXPENSE.GET_ALL_CATEGORIES,
      {}
    );
    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("Error in getAllCategoriesController:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message:
        "An internal server error occurred while fetching all categories.",
    });
  }
};
export const deleteCategoryController = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Category ID is required",
      });
    }

    const response = await sendRPCRequest(
      ACCOUNTS_PATTERN.EXPENSE.DELETE_CATEGORY,
      { categoryId }
    );

    return res.status(response.status || 500).json(response);
  } catch (error) {
    console.error("Error in deleteCategoryController:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "An internal server error occurred while deleting category.",
    });
  }
};
