import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    vendorName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    vendorType: {
      type: String,
      enum: [
        "GENERAL", "MAINTENANCE", "ELECTRICAL", "PLUMBING", "CARPENTRY", "PAINTING", "HOUSEKEEPING", "FOOD", "LAUNDRY", "SECURITY", "INTERNET", "UTILITY", "FURNITURE", "APPLIANCE REPAIR", "PEST CONTROL", "CONSTRUCTION", "ELEVATOR MAINTENANCE", "FIRE SAFETY", "REAL ESTATE AGENT", "LEGAL", "ACCOUNTING", "INTERIOR DESIGN", "BANK", "OTHERS"
      ],
      required: true,
      default: "GENERAL",
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

const Vendor = mongoose.model("Vendor", vendorSchema);
export default Vendor;
