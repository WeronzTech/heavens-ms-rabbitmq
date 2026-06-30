import mongoose from "mongoose";

const roomChangeRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    currentRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    currentRoomNo: {
      type: String,
      required: true,
    },
    // currentBedId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   required: true,
    // },
    // currentBedName: {
    //   type: String,
    //   required: true,
    // },
    requestedRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    requestedRoomNo: {
      type: String,
      required: true,
    },
    assignedRoomId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    assignedRoomNo: {
      type: String,
    },
    // assignedBedId: {
    //   type: mongoose.Schema.Types.ObjectId,
    // },
    // assignedBedName: {
    //   type: String,
    // },
    reason: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "reassigned"],
      default: "pending",
    },
    rejectedReason: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const RoomChangeRequest = mongoose.model("RoomChangeRequest", roomChangeRequestSchema);

export default RoomChangeRequest;
