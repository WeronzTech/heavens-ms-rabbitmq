import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { ACCOUNTS_PATTERN } from "../../../../libs/patterns/accounts/accounts.pattern.js";
import {
  addExpense,
  addExpenseCategory,
  deleteCategory,
  deleteExpense,
  getAllCategories,
  getAllExpenses,
  getCategoryByMainCategory,
  getExpenseAnalytics,
  getExpenseById,
  getPettyCashPaymentsByManager,
  updateExpense,
} from "../service/expense.service.js";

createResponder(ACCOUNTS_PATTERN.EXPENSE.ADD_EXPENSE, async (data) => {
  return await addExpense(data);
});

createResponder(ACCOUNTS_PATTERN.EXPENSE.GET_ALL_EXPENSES, async (data) => {
  return await getAllExpenses(data);
});

createResponder(ACCOUNTS_PATTERN.EXPENSE.GET_EXPENSE_BY_ID, async (data) => {
  return await getExpenseById(data);
});

createResponder(ACCOUNTS_PATTERN.EXPENSE.DELETE_EXPENSE, async (data) => {
  return await deleteExpense(data);
});

createResponder(ACCOUNTS_PATTERN.EXPENSE.ADD_EXPENSE_CATEGORY, async (data) => {
  return await addExpenseCategory(data);
});

createResponder(
  ACCOUNTS_PATTERN.EXPENSE.GET_CATEGORY_BY_MAINCATEROGY,
  async (data) => {
    return await getCategoryByMainCategory(data);
  }
);

createResponder(ACCOUNTS_PATTERN.EXPENSE.GET_ALL_CATEGORIES, async (data) => {
  return await getAllCategories(data);
});

createResponder(
  ACCOUNTS_PATTERN.EXPENSE.GET_EXPENSE_ANALYTICS,
  async (data) => {
    return await getExpenseAnalytics(data);
  }
);

createResponder(ACCOUNTS_PATTERN.EXPENSE.DELETE_CATEGORY, async (data) => {
  return await deleteCategory(data);
});

createResponder(
  ACCOUNTS_PATTERN.EXPENSE.GET_PETTYCASH_PAYMENTS_BY_MANAGER,
  async (data) => {
    return await getPettyCashPaymentsByManager(data);
  }
);

createResponder(ACCOUNTS_PATTERN.EXPENSE.UPDATE_EXPENSE, async (data) => {
  return await updateExpense(data);
});
