import mongoose from "mongoose";

const pettycashSchema = new mongoose.Schema({
  inHandAmount: { type: Number, required: true, default: 0 },
  inAccountAmount: { type: Number, required: true, default: 0 },
  managerName: { type: String, required: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
},
  { timestamps: true })

const PettyCash = mongoose.model('PettyCash', pettycashSchema)

export default PettyCash;


