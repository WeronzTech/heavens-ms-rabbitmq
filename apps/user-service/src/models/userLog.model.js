import mongoose from "mongoose";

const userLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "delete",
        "extend",
        "block_user",
        "unblock_user",
      ],
    },
    changedByName: {
      type: String,
      required: true,
    },
    message: {type: String, required: true},
    propertyId: {type: mongoose.Schema.Types.ObjectId},
    kitchenId: {type: mongoose.Schema.Types.ObjectId},
  },
  {
    timestamps: true,
  }
);

const UserLog = mongoose.model("UserLog", userLogSchema);

export default UserLog;
