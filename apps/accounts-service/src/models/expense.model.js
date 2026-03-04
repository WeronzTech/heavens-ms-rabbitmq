import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    title: {type: String, required: true},
    type: {type: String, required: true},
    category: {type: String, required: true},
    description: {type: String, default: ""},
    paymentMethod: {type: String, required: true},
    pettyCashType: {
      type: String,
      enum: ["inHand", "inAccount"],
      required: function () {
        return this.paymentMethod === "Petty Cash";
      },
    },
    transactionId: {type: String, required: false},
    amount: {type: Number, required: true},
    handledBy: mongoose.Schema.Types.ObjectId,
    date: {type: Date, required: true},
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
    actionPerformedBy: {type: String, required: false},
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    imageUrl: {
      type: String,
      default: "",
    },
  },
  {timestamps: true},
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
// import mongoose from "mongoose";

// const expenseSchema = new mongoose.Schema(
//   {
//     // 🔹 Basic info
//     title: { type: String, required: true },
//     type: {
//       type: String,
//       enum: ["PG", "Mess", "Others"],
//       required: true,
//     },
//     category: { type: String, required: true },
//     description: { type: String, default: "" },

//     // 🔹 Payment info
//     paymentMethod: { type: String, required: true }, // Cash | Bank | Petty Cash
//     pettyCashType: {
//       type: String,
//       enum: ["inHand", "inAccount"],
//       required: function () {
//         return this.paymentMethod === "Petty Cash";
//       },
//     },
//     transactionId: { type: String },

//     // 🔹 Amount (PAYMENT amount)
//     amount: { type: Number, required: true },

//     // 🔹 Used ONLY when expense is NOT shared
//     property: {
//       id: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
//       name: String,
//       _id: false,
//     },

//     kitchenId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Kitchen",
//     },

//     // 🔹 Flags
//     isShared: { type: Boolean, default: false },

//     // 🔹 Metadata
//     handledBy: mongoose.Schema.Types.ObjectId,
//     createdBy: mongoose.Schema.Types.ObjectId,
//     actionPerformedBy: { type: String, required: false },

//     date: { type: Date, required: true },
//     imageUrl: { type: String, default: "" },

//     // 🔹 Voucher support
//     fromVoucher: { type: Boolean, default: false },
//     voucherId: mongoose.Schema.Types.ObjectId,
//   },
//   { timestamps: true },
// );

// expenseSchema.index({ date: -1 });
// expenseSchema.index({ type: 1, category: 1 });

// export default mongoose.model("Expense", expenseSchema);
