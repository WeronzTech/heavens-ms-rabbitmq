import mongoose from "mongoose";

const merchantDiscountSchema = new mongoose.Schema(
  {
    discountName: {
      type: String,
      required: true,
    },
    maxCheckoutValue: {
      type: Number,
      required: true,
    },
    maxDiscountValue: {
      type: Number,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["Flat-discount", "Percentage-discount"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      required: true,
    },
    merchantId: {
      type: String,
      ref: "Merchant",
      required: true,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const MerchantDiscount = mongoose.model(
  "MerchantDiscount",
  merchantDiscountSchema
);
export default MerchantDiscount;
