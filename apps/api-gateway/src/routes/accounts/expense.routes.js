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
} from "../../controllers/accounts/expense.controller.js";
import { upload } from "../../../../../libs/common/imageOperation.js";

const expenseRoutes = express.Router();

expenseRoutes.post(
  "/add",
  upload.fields([{ name: "billImage", maxCount: 1 }]),
  addExpenseController
);

expenseRoutes.post("/add-category", addExpenseCategoryController);

expenseRoutes.get("/categories/by-main", getCategoryByMainCategoryController);

expenseRoutes.get("/all", getAllExpensesController);

expenseRoutes.get("/get-all", getAllCategoriesController);

expenseRoutes.get("/analytics", getExpenseAnalytics);

// expenseRoutes.put("/update/:id", updateExpense);

expenseRoutes.delete("/delete/:expenseId", deleteExpenseController);

expenseRoutes.delete("/categories/:categoryId", deleteCategoryController);

expenseRoutes.get("/:expenseId", getExpenseByIdController);

export default expenseRoutes;
