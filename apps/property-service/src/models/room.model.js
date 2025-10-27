import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  propertyName: { type: String, required: true },
  roomNo: { type: String, required: true },
  sharingType: { type: String, required: true },
  roomCapacity: { type: Number, required: true },
  occupant: { type: Number, required: true },
  vacantSlot: { type: Number, required: true },
  status: { type: String, required: true },
  description: { type: String, required: false },
  revenueGeneration: { type: Boolean, default: true },
  roomOccupants: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, required: false },
      userType: {
        type: String,
        enum: ["longTermResident", "dailyRenter"],
        required: false,
      },
      _id: false,
    },
  ],
  isHeavens: { type: Boolean, default: false },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  floorId: {type: mongoose.Schema.Types.ObjectId}
});

export default mongoose.model("Room", roomSchema);
