import mongoose from "mongoose";
import DatabaseCounter from "./databaseCounter.model.js";

const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      unique: true,
    },
    jobTitle: { type: String, required: true },
    name: { type: String, required: true },
    gender: { type: String, required: true },
    dob: { type: Date, required: true },
    contactNumber: { type: String, required: true },
    address: { type: String, required: false },
    email: { type: String, required: true },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    photo: { type: String, required: false },
    aadharFrontImage: { type: String, required: false },
    aadharBackImage: { type: String, required: false },
    joinDate: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    propertyId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    updatedBy: { type: String },
    deleted: { type: Boolean, default: false },
    salary: { type: Number, required: true },
    pendingSalary: { type: Number, default: 0 },
    advanceSalary: { type: Number, default: 0 },
    kitchenId: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  { timestamps: true }
);

staffSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = `0${now.getMonth() + 1}`.slice(-2);

      let counter = await DatabaseCounter.findOneAndUpdate(
        {
          type: "Staff",
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!counter) {
        throw new Error("Counter document could not be created or updated.");
      }

      const customId = `HVNS-S${year}${month}${counter.count}`;
      this.staffId = customId;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Staff = mongoose.model("Staff", staffSchema);

export default Staff;
