import mongoose from "mongoose";

const staffSalaryHistorySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  employeeName: {type: String , required:true},
  employeeType: {
    type: String,
    required: true,
    enum: ["Staff", "Manager"],
  },
  salary: { type: Number, required: true },
  date: { type: Date, required: true },
  salaryCut: { type: Number, default: 0 },
  salaryIncrement: { type: Number, default: 0 },
  salaryPending: { type: Number, default: 0 },
  advanceSalary: { type: Number, default: 0 },
  status: {
    type: String,
    required: true,
    enum: ["pending", "paid"],
    default: "pending",
  },
  paidAmount: { type: Number, default: 0 },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  paymentMethod: { type: String, required: true },
  remarkType: {
    type: String,
    enum: ["AUTOMATIC_GENERATION", "MANUAL_ADDITION", "PAYMENT"],
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
