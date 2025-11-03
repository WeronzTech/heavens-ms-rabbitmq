import mongoose from "mongoose";

const mediaItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    url: { type: String, required: true },
    key: { type: String, default: "" },
  },
  { _id: false }
);

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    iconLibrary: { type: String, default: "fa" },
    iconName: { type: String, required: true },
  },
  { _id: false }
);

const websitePropertyContentSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      unique: true,
    },

    propertyName: { type: String, required: true },
    description: { type: String },
    subDescription: { type: String },

    location: {
      fullAddress: { type: String, required: true },
      mainArea: { type: String, required: true },
    },

    videos: {
      type: [mediaItemSchema],
      default: [],
    },

    images: {
      type: [mediaItemSchema],
      default: [],
    },

    amenities: {
      type: [amenitySchema],
      default: [],
    },

    mapLink: { type: String, default: "" },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model(
  "WebsitePropertyContent",
  websitePropertyContentSchema
);
