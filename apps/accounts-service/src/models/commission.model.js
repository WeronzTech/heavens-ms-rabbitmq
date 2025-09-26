import mongoose from "mongoose";

const commissionSchema = new mongoose.Schema(
  {
    agent: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      contact: {
        type: String,
        trim: true,
      },
    },
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentType: {
      type: String,
      required: true,
      enum: ["Cash", "UPI", "Bank Transfer", "Razorpay"],
    },
    transactionId: {
      type: String,
    },
    userIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Commission = mongoose.model("Commission", commissionSchema);
export default Commission;
