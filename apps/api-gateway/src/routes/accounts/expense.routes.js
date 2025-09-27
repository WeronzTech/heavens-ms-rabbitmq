import express from "express";
import { addExpenseCategoryController, addExpenseController, 
    deleteCategoryController, 
    deleteExpenseController, 
    getAllCategoriesController, 
    getAllExpensesController, 
    getCategoryByMainCategoryController, 
    getExpenseByIdController } from "../../controllers/accounts/expense.controller.js";



const expenseRoutes = express.Router();


expenseRoutes.post("/add", addExpenseController);

expenseRoutes.post("/add-category", addExpenseCategoryController);

expenseRoutes.get("/all", getAllExpensesController);

expenseRoutes.get("/:expenseId", getExpenseByIdController);

// expenseRoutes.put("/update/:id", updateExpense);

expenseRoutes.delete("/delete/:expenseId", deleteExpenseController);

expenseRoutes.post("/categories/by-main", getCategoryByMainCategoryController);

expenseRoutes.get("/categories", getAllCategoriesController);

expenseRoutes.delete("/categories/:categoryId", deleteCategoryController);




export default expenseRoutes;