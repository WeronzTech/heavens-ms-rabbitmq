import mongoose from "mongoose";

const pettycashSchema = new mongoose.Schema(
  {
    managerName: { type: String, required: true },
    inHandAmount: { type: Number, required: true, default: 0 },
    inAccountAmount: { type: Number, required: true, default: 0 },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
    },
    // property: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

const PettyCash = mongoose.model("PettyCash", pettycashSchema);

export default PettyCash;
