// models/User.model.js
import mongoose from "mongoose";
import DatabaseCounter from "./databaseCounter.model.js";

const managerSchema = new mongoose.Schema(
  {
    managerId: { type: String, unique: true },
    jobTitle: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: mongoose.Schema.Types.ObjectId, required: true },
    joinDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      required: true,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    gender: { type: String, required: false },
    address: { type: String, required: false },
    salary: { type: Number, required: true },
    advanceSalary: { type: Number, default: 0 },
    photo: { type: String, required: false },
    aadhaarImage: { type: String, required: true },
    panCardImage: { type: String, required: true },
    panCardNumber: { type: String, required: true },
    propertyId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    ],
    isVerified: { type: Boolean, default: true },
    loginEnabled: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

managerSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = `0${now.getMonth() + 1}`.slice(-2);

      let counter = await DatabaseCounter.findOneAndUpdate(
        {
          type: "Manager",
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!counter) {
        throw new Error("Counter document could not be created or updated.");
      }

      const customId = `HVNS-M${year}${month}${counter.count}`;
      this.managerId = customId;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Manager = mongoose.model("Manager", managerSchema);

export default Manager;
