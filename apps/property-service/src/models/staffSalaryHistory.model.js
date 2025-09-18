import mongoose from "mongoose";

const staffSalaryHistorySchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
  salary: { type: Number, required: true },
  date: { type: Date, required: true },
  salaryCut: { type: Number, required: false },
  salaryIncrement: { type: Number, required: false },
  salaryPending: { type: Number, required: false },
  advanceSalary: { type: Number, required: false },
  status: {
    type: String,
    required: true,
    enum: ["pending", "paid"],
    default: "pending",
  },
  paidAmount: { type: Number, required: false },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  remarkType: {
    type: String,
    required: false,
  },
});

const StaffSalaryHistory = mongoose.model(
  "StaffSalaryHistory",
  staffSalaryHistorySchema
);

export default StaffSalaryHistory;
