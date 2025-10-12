import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    isReminder: {
      type: Boolean,
      default: false,
    },
    reminderDate: {
      type: Date,
      required: function () {
        return this.isReminder;
      },
    },
    reminderStatus: {
      type: String,
      enum: ["pending", "completed", "snoozed"],
      default: "pending",
    },
    followUpActions: [
      {
        action: String,
        takenBy: String,
        date: Date,
        notes: String,
      },
    ],
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
noteSchema.index({ userId: 1 });
noteSchema.index({ reminderDate: 1 });
noteSchema.index({ reminderStatus: 1 });
noteSchema.index({ isReminder: 1 });
noteSchema.index({ userId: 1, reminderStatus: 1 });

const Note = mongoose.model("Note", noteSchema);

export default Note;
