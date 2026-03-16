import mongoose from "mongoose";

const staffSalaryHistorySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  employeeName: {type: String, required: true},
  employeeType: {
    type: String,
    required: true,
    enum: ["Staff", "Manager"],
  },
  salary: {type: Number, required: true}, // The gross salary calculated for the month
  paymentDate: {type: Date, required: true}, // The month this salary is for
  salaryPending: {type: Number, default: 0},

  paidAmount: {type: Number, default: 0},
  createdBy: {
    type: String,
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
  },
  paymentMethod: {
    type: String,
    enum: ["Cash", "UPI", "Bank Transfer", "Petty Cash"],
    required: true,
  },
  pettyCashType: {
    type: String,
    enum: ["inHand", "inAccount"],
    required: function () {
      return this.paymentMethod === "Petty Cash";
    },
  },
  transactionId: {type: String},
  remarks: {
    type: String,
  },
  month: Number,
  year: Number,
  isAdvance: {type: Boolean, default: false},
  propertyId: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  kitchenId: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  clientId: mongoose.Schema.Types.ObjectId,
});

const StaffSalaryHistory = mongoose.model(
  "StaffSalaryHistory",
  staffSalaryHistorySchema,
);

export default StaffSalaryHistory;
