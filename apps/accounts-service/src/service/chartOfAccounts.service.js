import mongoose from "mongoose";
import AccountCategory from "../models/accountsCategory.model.js";
import ChartOfAccount from "../models/chartOfAccounts.model.js";
import JournalEntry from "../models/journalEntry.model.js";

// --- Account Category (Account Heads) Services ---

/**
 * Creates a new account category (account head).
 * @param {object} data { name, accountType, parent (optional, for sub-category) }
 */
export const createAccountCategory = async (data) => {
  const { name, accountType, parent, description } = data;
  if (!name || !accountType) {
    return {
      success: false,
      status: 400,
      message: "Name and Account Type are required.",
    };
  }

  // If a parent is provided, ensure it exists
  if (parent) {
    const parentCategory = await AccountCategory.findById(parent);
    if (!parentCategory) {
      return {
        success: false,
        status: 404,
        message: "Parent category not found.",
      };
    }
    // A sub-category must have the same accountType as its parent
    if (parentCategory.accountType !== accountType) {
      return {
        success: false,
        status: 400,
        message: `Sub-category must have the same account type as its parent (${parentCategory.accountType}).`,
      };
    }
  }

  try {
    const newCategory = await AccountCategory.create({
      name,
      accountType,
      parent: parent || null,
      description,
    });
    return { success: true, status: 201, data: newCategory };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        status: 409,
        message: "A category with this name already exists under this parent.",
      };
    }
    return { success: false, status: 500, message: error.message };
  }
};

/**
 * Gets all account categories in a nested (Tally-like) tree structure.
 * @param {object} filters { accountType (optional) }
 */
export const getAccountCategories = async (filters) => {
  const { accountType } = filters;
  const query = accountType ? { accountType } : {};

  const categories = await AccountCategory.find(query).lean();

  // Helper function to build the tree
  const buildTree = (parentId = null) => {
    return categories
      .filter(
        (category) =>
          (category.parent ? category.parent.toString() : null) === parentId
      )
      .map((category) => ({
        ...category,
        subCategories: buildTree(category._id.toString()), // Recursively find children
      }));
  };

  const tree = buildTree(null); // Start from root (null parents)
  return { success: true, status: 200, data: tree };
};

/**
 * Updates an account category.
 */
export const updateAccountCategory = async (categoryId, updateData) => {
  const { name, description, parent } = updateData;
  if (!categoryId) {
    return { success: false, status: 400, message: "Category ID is required." };
  }

  try {
    const updatedCategory = await AccountCategory.findByIdAndUpdate(
      categoryId,
      { name, description, parent },
      { new: true, runValidators: true }
    );
    if (!updatedCategory) {
      return { success: false, status: 404, message: "Category not found." };
    }
    return { success: true, status: 200, data: updatedCategory };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        status: 409,
        message: "A category with this name already exists under this parent.",
      };
    }
    return { success: false, status: 500, message: error.message };
  }
};

/**
 * Deletes an account category.
 * Performs checks to prevent deletion if it's in use.
 */
export const deleteAccountCategory = async (categoryId) => {
  if (!categoryId) {
    return { success: false, status: 400, message: "Category ID is required." };
  }

  // 1. Check for sub-categories
  const childCategory = await AccountCategory.findOne({ parent: categoryId });
  if (childCategory) {
    return {
      success: false,
      status: 400,
      message:
        "Cannot delete. This category has sub-categories. Please delete them first.",
    };
  }

  // 2. Check for ledgers (accounts) using this category
  const account = await ChartOfAccount.findOne({ categoryId: categoryId });
  if (account) {
    return {
      success: false,
      status: 400,
      message:
        "Cannot delete. This category is in use by one or more ledgers (accounts).",
    };
  }

  try {
    const deletedCategory = await AccountCategory.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      return { success: false, status: 404, message: "Category not found." };
    }
    return {
      success: true,
      status: 200,
      message: "Category deleted successfully.",
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};

// --- Chart of Accounts (Ledger) Services ---

/**
 * Creates a new account (ledger).
 * @param {object} data { name, accountType, categoryId, balance (optional) }
 */
export const createAccount = async (data) => {
  const { name, accountType, categoryId, balance } = data;
  if (!name || !accountType || !categoryId) {
    return {
      success: false,
      status: 400,
      message: "Name, Account Type, and Category are required.",
    };
  }

  // 1. Validate Category
  const category = await AccountCategory.findById(categoryId);
  if (!category) {
    return { success: false, status: 404, message: "Category not found." };
  }
  if (category.accountType !== accountType) {
    return {
      success: false,
      status: 400,
      message: "Account type must match its category's type.",
    };
  }

  // 2. Create Account
  try {
    const newAccount = await ChartOfAccount.create({
      name,
      accountType,
      categoryId,
      balance: balance || 0,
    });
    return { success: true, status: 201, data: newAccount };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        status: 409,
        message: "An account (ledger) with this name already exists.",
      };
    }
    return { success: false, status: 500, message: error.message };
  }
};

/**
 * Gets accounts, optionally filtered by category or account type.
 * @param {object} filters { categoryId, accountType }
 */
export const getAccounts = async (filters) => {
  const { categoryId, accountType } = filters;
  const query = {};
  if (categoryId) query.categoryId = categoryId;
  if (accountType) query.accountType = accountType;

  const accounts = await ChartOfAccount.find(query)
    .populate("categoryId", "name parent") // Populate category info
    .lean();

  return { success: true, status: 200, data: accounts };
};

/**
 * Gets a single account by its ID.
 */
export const getAccountById = async (accountId) => {
  if (!accountId) {
    return { success: false, status: 400, message: "Account ID is required." };
  }
  const account = await ChartOfAccount.findById(accountId)
    .populate("categoryId")
    .lean();
  if (!account) {
    return { success: false, status: 404, message: "Account not found." };
  }
  return { success: true, status: 200, data: account };
};

/**
 * Updates an account (ledger).
 */
export const updateAccount = async (accountId, updateData) => {
  const { name, categoryId, description } = updateData;
  if (!accountId) {
    return { success: false, status: 400, message: "Account ID is required." };
  }

  try {
    const updatedAccount = await ChartOfAccount.findByIdAndUpdate(
      accountId,
      { name, categoryId, description },
      { new: true, runValidators: true }
    );
    if (!updatedAccount) {
      return { success: false, status: 404, message: "Account not found." };
    }
    return { success: true, status: 200, data: updatedAccount };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        status: 409,
        message: "An account (ledger) with this name already exists.",
      };
    }
    return { success: false, status: 500, message: error.message };
  }
};

/**
 * Deletes an account (ledger).
 * If transactions exist, it requires a 'moveToAccountId' to transfer them.
 * @param {string} accountId - The ID of the account to delete.
 * @param {string} [moveToAccountId] - The ID of the account to move transactions to.
 */
export const deleteAccount = async (accountId, moveToAccountId) => {
  if (!accountId) {
    return { success: false, status: 400, message: "Account ID is required." };
  }

  // 1. Check if transactions exist for this account
  const transactionCount = await JournalEntry.countDocuments({
    "transactions.accountId": accountId,
  });

  if (transactionCount > 0) {
    if (!moveToAccountId) {
      return {
        success: false,
        status: 400,
        message: `This account has ${transactionCount} transactions. Please provide a 'moveToAccountId' to transfer them before deleting.`,
      };
    }

    // 2. Validate the 'moveToAccountId'
    const [accountToDelete, accountToMoveTo] = await Promise.all([
      ChartOfAccount.findById(accountId),
      ChartOfAccount.findById(moveToAccountId),
    ]);

    if (!accountToMoveTo) {
      return {
        success: false,
        status: 404,
        message: "The 'move to' account was not found.",
      };
    }
    if (accountToDelete.accountType !== accountToMoveTo.accountType) {
      return {
        success: false,
        status: 400,
        message:
          "Transactions can only be moved to an account of the same type (e.g., Expense to Expense).",
      };
    }

    // 3. Move transactions and balance in a database transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 3a. Update all journal entries
      await JournalEntry.updateMany(
        { "transactions.accountId": accountId },
        { $set: { "transactions.$[elem].accountId": moveToAccountId } },
        { arrayFilters: [{ "elem.accountId": accountId }], session }
      );

      // 3b. Transfer balance
      const balanceToMove = accountToDelete.balance;
      await ChartOfAccount.updateOne(
        { _id: moveToAccountId },
        { $inc: { balance: balanceToMove } },
        { session }
      );

      // 3c. Delete the old account
      await ChartOfAccount.findByIdAndDelete(accountId, { session });

      await session.commitTransaction();
      return {
        success: true,
        status: 200,
        message: `Successfully moved ${transactionCount} transactions and deleted account.`,
      };
    } catch (error) {
      await session.abortTransaction();
      return {
        success: false,
        status: 500,
        message: `Transaction failed: ${error.message}`,
      };
    } finally {
      session.endSession();
    }
  } else {
    // 4. No transactions, safe to delete
    try {
      const deletedAccount = await ChartOfAccount.findByIdAndDelete(accountId);
      if (!deletedAccount) {
        return { success: false, status: 404, message: "Account not found." };
      }
      return {
        success: true,
        status: 200,
        message: "Account deleted successfully.",
      };
    } catch (error) {
      return { success: false, status: 500, message: error.message };
    }
  }
};
