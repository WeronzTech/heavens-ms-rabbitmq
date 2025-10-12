import mongoose from "mongoose";

const commissionSchema = new mongoose.Schema(
  {
    agentName: {
      type: String,
      required: true,
      trim: true,
    },
    agencyName: {
      type: String,
      trim: true,
      required: false,
    },
    contactNumber: {
      type: String,
      required: false,
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
    remarks: {
      type: String,
      required: false,
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // userIds: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //   },
    // ],
  },
  {
    timestamps: true,
  }
);

const Commission = mongoose.model("Commission", commissionSchema);
export default Commission;
