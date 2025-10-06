import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: "" },
    paymentMethod: { type: String, required: true },
    pettyCashType: {
      type: String,
      enum: ["inHand", "inAccount"],
      required: function () {
        return this.paymentMethod === "Petty Cash";
      },
    },
    transactionId: { type: String, required: false },
    amount: { type: Number, required: true },
    handledBy: mongoose.Schema.Types.ObjectId,
    date: { type: Date, required: true },
    property: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      _id: false,
    },
    kitchenId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    actionPerformedBy: { type: String, required: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    imageUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
