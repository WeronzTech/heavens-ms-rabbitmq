import mongoose from "mongoose";

const floorSchema = new mongoose.Schema({
  floorName: { type: String, required: true },
  floorNo: { type: String, required: true },
  roomCapacity: { type: Number, required: true },
  vacantSlot: { type: Number, required: true },
  status: { type: String, required: true },
  description: { type: String, required: false },
  isHeavens: { type: Boolean, default: false },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  roomIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }],
});

const Floor = mongoose.model("Floor", floorSchema);

export default Floor;
