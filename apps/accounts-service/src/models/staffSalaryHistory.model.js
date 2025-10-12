import mongoose from "mongoose";

const staffSalaryHistorySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  employeeName: { type: String, required: true },
  employeeType: {
    type: String,
    required: true,
    enum: ["Staff", "Manager"],
  },
  salary: { type: Number, required: true }, // The gross salary calculated for the month
  date: { type: Date, required: true }, // The month this salary is for
  salaryCut: { type: Number, default: 0 },
  salaryIncrement: { type: Number, default: 0 },
  salaryPending: { type: Number, default: 0 },
  advanceSalary: { type: Number, default: 0 }, // Advance amount deducted for this month's salary
  status: {
    type: String,
    required: true,
    enum: ["pending", "paid"],
    default: "pending",
  },
  paidAmount: { type: Number, default: 0 },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Not required for auto-generation
  },
  paymentMethod: { type: String },
  transactionId: { type: String },
  remarkType: {
    type: String,
    enum: [
      "AUTOMATIC_GENERATION",
      "MANUAL_ADDITION",
      "PAYMENT",
      "ADVANCE_PAYMENT",
    ],
    required: false,
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  kitchenId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
});

const StaffSalaryHistory = mongoose.model(
  "StaffSalaryHistory",
  staffSalaryHistorySchema
);

export default StaffSalaryHistory;
