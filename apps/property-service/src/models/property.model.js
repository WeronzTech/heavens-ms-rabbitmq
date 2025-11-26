import mongoose from "mongoose";
import DatabaseCounter from "./databaseCounter.model.js";

const propertySchema = new mongoose.Schema({
  propertyId: {
    type: String,
    unique: true,
  },
  propertyName: String,
  contacts: {
    primary: {
      type: String,
      required: false,
    },
    alternate: {
      type: String,
      required: false,
    },
  },
  branch: String,
  phase: String,
  location: String,
  address: String,
  totalBeds: { type: Number, default: 0 },
  occupiedBeds: { type: Number, default: 0 },
  totalFloors: { type: Number, default: 0 },
  startingPrice: Number,
  sharingPrices: {
    type: Map,
    of: Number,
  },
  deposit: {
    refundable: Number,
    nonRefundable: Number,
  },
  propertyTitle: String,
  preferredBy: String,
  propertyType: String,
  amenities: [String],
  map: String,
  images: {
    propertyPhotos: [String],
    eventPhotos: [String],
    companyPhotos: [String],
  },
  isHeavens: { type: Boolean, default: false },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: false,
  },
  kitchenId: { type: mongoose.Schema.Types.ObjectId, required: false },
  razorpayCredentials: {
    keyId: { type: String, required: false },
    keySecret: { type: String, required: false },
  },
});

propertySchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = `0${now.getMonth() + 1}`.slice(-2);

      let counter = await DatabaseCounter.findOneAndUpdate(
        {
          type: "Property",
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!counter) {
        throw new Error("Counter document could not be created or updated.");
      }

      const customId = `HVNS-P${year}${month}${counter.count}`;
      this.propertyId = customId;
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("Property", propertySchema);
