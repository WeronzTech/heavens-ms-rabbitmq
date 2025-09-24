import mongoose, { Schema } from "mongoose";

const eventPermissionSchema = new Schema(
  {
    eventName: {
      type: String,
      required: [true, "Event name is required."],
      unique: true,
      trim: true,
    },
    userRoles: [
      {
        type: Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const EventPermission = mongoose.model(
  "EventPermission",
  eventPermissionSchema
);

export default EventPermission;
