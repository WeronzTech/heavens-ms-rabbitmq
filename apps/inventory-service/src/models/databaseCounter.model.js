import mongoose from "mongoose";

const databaseCounterSchema = mongoose.Schema({
  type: {
    type: String,
    enum: ["Addon", "Mess"],
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});

const DatabaseCounter = mongoose.model(
  "DatabaseCounter",
  databaseCounterSchema
);

export default DatabaseCounter;
