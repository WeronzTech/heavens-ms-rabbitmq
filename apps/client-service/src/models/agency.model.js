import mongoose, { Schema } from "mongoose";

const staffSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const agencySchema = new Schema(
  {
    agencyName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    staffs: {
      type: [staffSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Agency = mongoose.model("Agency", agencySchema);

export default Agency;
