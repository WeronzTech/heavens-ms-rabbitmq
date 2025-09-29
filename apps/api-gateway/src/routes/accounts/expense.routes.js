import express from "express";
import {
  addExpenseCategoryController,
  addExpenseController,
  deleteCategoryController,
  deleteExpenseController,
  getAllCategoriesController,
  getAllExpensesController,
  getCategoryByMainCategoryController,
  getExpenseByIdController,
} from "../../controllers/accounts/expense.controller.js";

const expenseRoutes = express.Router();

expenseRoutes.post("/add", addExpenseController);

expenseRoutes.post("/add-category", addExpenseCategoryController);

expenseRoutes.get("/categories/by-main", getCategoryByMainCategoryController);

expenseRoutes.get("/all", getAllExpensesController);

expenseRoutes.get("/get-all", getAllCategoriesController);

// expenseRoutes.put("/update/:id", updateExpense);

expenseRoutes.delete("/delete/:expenseId", deleteExpenseController);

expenseRoutes.delete("/categories/:categoryId", deleteCategoryController);

expenseRoutes.get("/:expenseId", getExpenseByIdController);

export default expenseRoutes;
