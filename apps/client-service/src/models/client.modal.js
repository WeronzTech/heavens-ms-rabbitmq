import mongoose from "mongoose";
import DatabaseCounter from "./databaseCounter.model.js";

const clientSchema = new mongoose.Schema(
  {
    clientId: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true },
    password: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    role: { type: mongoose.Schema.Types.ObjectId, required: true },
    isVerified: { type: Boolean, default: false },
    loginEnabled: {
      type: Boolean,
      default: false,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

clientSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = `0${now.getMonth() + 1}`.slice(-2);

      let counter = await DatabaseCounter.findOneAndUpdate(
        {
          type: "Client",
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!counter) {
        throw new Error("Counter document could not be created or updated.");
      }

      const customId = `HVNS-CL${year}${month}${counter.count}`;
      this.clientId = customId;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Client = mongoose.model("Client", clientSchema);
export default Client;
