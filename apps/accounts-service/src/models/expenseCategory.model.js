import mongoose from "mongoose";

const expenseCategorySchema = new mongoose.Schema({
  mainCategory: { type: String, required: true, unique: true },
  subCategory: { type: String, required: true, unique: true },
});

const ExpenseCategory = mongoose.model(
  "Expense category",
  expenseCategorySchema
);
export default ExpenseCategory;
