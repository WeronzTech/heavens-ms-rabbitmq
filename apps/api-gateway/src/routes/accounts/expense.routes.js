import express from "express";
import {
  addExpenseCategoryController,
  addExpenseController,
  deleteCategoryController,
  deleteExpenseController,
  getAllCategoriesController,
  getAllExpensesController,
  getCategoryByMainCategoryController,
  getExpenseAnalytics,
  getExpenseByIdController,
  getPettyCashPaymentByManager,
  updateExpenseController,
} from "../../controllers/accounts/expense.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";
import { isAuthenticated } from "../../middleware/isAuthenticated.js";
import { hasPermission } from "../../middleware/hasPermission.js";
import { PERMISSIONS } from "../../../../../libs/common/permissions.list.js";

const expenseRoutes = express.Router();

expenseRoutes.use(isAuthenticated);

expenseRoutes.post(
  "/add",
  hasPermission(PERMISSIONS.EXPENSE_MANAGE),
  upload.fields([{ name: "billImage", maxCount: 1 }]),
  addExpenseController,
);

expenseRoutes.post(
  "/add-category",
  hasPermission(PERMISSIONS.EXPENSE_MANAGE),
  addExpenseCategoryController,
);

expenseRoutes.get(
  "/categories/by-main",
  hasPermission(PERMISSIONS.EXPENSE_VIEW),
  getCategoryByMainCategoryController,
);

expenseRoutes.get(
  "/all",
  hasPermission(PERMISSIONS.EXPENSE_VIEW),
  getAllExpensesController,
);

expenseRoutes.get(
  "/get-all",
  hasPermission(PERMISSIONS.EXPENSE_VIEW),
  getAllCategoriesController,
);

expenseRoutes.get(
  "/analytics",
  hasPermission(PERMISSIONS.EXPENSE_VIEW),
  getExpenseAnalytics,
);

expenseRoutes.put(
  "/update/:expenseId",
  hasPermission(PERMISSIONS.EXPENSE_MANAGE),
  updateExpenseController,
);

expenseRoutes.delete(
  "/delete/:expenseId",
  hasPermission(PERMISSIONS.EXPENSE_MANAGE),
  deleteExpenseController,
);

expenseRoutes.delete(
  "/categories/:categoryId",
  hasPermission(PERMISSIONS.EXPENSE_MANAGE),
  deleteCategoryController,
);

expenseRoutes.get(
  "/pettycash-manager",
  hasPermission(PERMISSIONS.PETTYCASH_VIEW),
  getPettyCashPaymentByManager,
);

expenseRoutes.get(
  "/:expenseId",
  hasPermission(PERMISSIONS.EXPENSE_VIEW),
  getExpenseByIdController,
);

export default expenseRoutes;
