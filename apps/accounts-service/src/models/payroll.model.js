import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employeeId: mongoose.Schema.Types.ObjectId,
    name: {type: String, required: true},
    jobTitle: {type: String, required: true},
    employeeType: {
      type: String,
      enum: ["Manager", "Staff"],
    },

    month: Number,
    year: Number,

    salary: Number,
    leaveDays: {type: Number, default: 0},
    leaveDeduction: {type: Number, default: 0},

    advanceAdjusted: {type: Number, default: 0},

    netSalary: Number,

    paidAmount: Number,
    pendingAmount: Number,

    status: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },

    paymentDate: Date,
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
  },
  {timestamps: true},
);

const Payroll = mongoose.model("Payroll", payrollSchema);

export default Payroll;
