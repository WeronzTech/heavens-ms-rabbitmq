import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    reportTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Role = mongoose.model("Role", roleSchema);
