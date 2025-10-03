import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    user: { type: String , required:true},
    description: { type : String , required: true},
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    amount: {type: Number , required: true},
    propertyName: {type: String },
    propertyId: { type: mongoose.Schema.Types.ObjectId }
  }
    
);

const Voucher = mongoose.model("Voucher", voucherSchema);

export default Voucher;
