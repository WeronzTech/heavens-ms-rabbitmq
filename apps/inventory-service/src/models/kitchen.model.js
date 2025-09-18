import mongoose from "mongoose";

const kitchenSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    propertyId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    ],
    location: {
      type: String,
      required: true,
      trim: true,
    },
    incharge: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

const Kitchen = mongoose.model("Kitchen", kitchenSchema);

export default Kitchen;
