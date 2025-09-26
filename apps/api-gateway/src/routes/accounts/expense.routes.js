import express from "express";
import { addExpenseController } from "../../controllers/accounts/expense.controller.js";


const expenseRoutes = express.Router();


expenseRoutes.post("/add", addExpenseController);

// expenseRoutes.get("/all", getAllExpenses);

// expenseRoutes.get("/:id", getExpenseById);

// expenseRoutes.put("/update/:id", updateExpense);

// expenseRoutes.delete("/delete/:id", deleteExpense);

// expenseRoutes.post("/addPettyCash", addPettyCash);

// expenseRoutes.get("/getPettyCash", getPettyCash)

// expenseRoutes.get("/pettyCash/:id",getPettyCashByManager)

export default expenseRoutes;