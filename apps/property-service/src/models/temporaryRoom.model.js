import mongoose from "mongoose";

const temporaryRoomSchema = new mongoose.Schema(
  {
    roomNo: { type: String, required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: false },
    roomCapacity: { type: Number, required: true },
    sharingType: { type: String, required: false },
    status: { type: String, enum: ["available", "unavailable"], default: "available" },
    description: { type: String, required: false },
    roomOccupants: [
      {
        name: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        bookingDate: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("TemporaryRoom", temporaryRoomSchema);
