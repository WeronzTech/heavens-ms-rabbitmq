import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "admin" },
  permissions: { type: [String], default: ["all"] },
  properties: { type: [String], default: ["all"] },
  approved: { type: Boolean, default: false },
  loginEnabled: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("Client", clientSchema);
