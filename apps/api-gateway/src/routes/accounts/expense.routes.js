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
import { upload } from "../../../../../libs/common/imageOperation.js";

const expenseRoutes = express.Router();

expenseRoutes.post(
  "/add",
  upload.fields([{ name: "billImage", maxCount: 1 }]),
  addExpenseController
);

expenseRoutes.post("/add-category", addExpenseCategoryController);

expenseRoutes.get("/all", getAllExpensesController);

expenseRoutes.get("/:expenseId", getExpenseByIdController);

// expenseRoutes.put("/update/:id", updateExpense);

expenseRoutes.delete("/delete/:expenseId", deleteExpenseController);

expenseRoutes.post("/categories/by-main", getCategoryByMainCategoryController);

expenseRoutes.get("/categories", getAllCategoriesController);

expenseRoutes.delete("/categories/:categoryId", deleteCategoryController);

export default expenseRoutes;
