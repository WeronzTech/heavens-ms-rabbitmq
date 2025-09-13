import mongoose, {Schema} from "mongoose";
import DatabaseCounter from "./databaseCounter.model.js";

const maintenanceSchema = new Schema(
  {
    maintenanceId: {
      type: String,
      unique: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      required: true,
      type: String,
    },
    roomNo: {
      type: String,
      required: false,
    },

    issue: {type: String, required: true},
    description: {type: String, required: true, maxlength: 200, trim: true},
    issueImage: {type: String, required: false},
    status: {
      type: String,
      enum: ["Pending", "Ongoing", "Resolved"],
      default: "Pending",
      required: true,
    },

    timeNeeded: {
      type: Number, // eg. 120 minutes for "2 hours"
      required: false,
    },

    reportedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {type: Date},
    resolvedAt: {type: Date},

    remarks: {
      type: String,
      maxlength: 200,
      trim: true,
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
  },
  {timestamps: true}
);

maintenanceSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = `0${now.getMonth() + 1}`.slice(-2);

      let counter = await DatabaseCounter.findOneAndUpdate(
        {
          type: "Maintenance",
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        },
        {$inc: {count: 1}},
        {new: true, upsert: true, setDefaultsOnInsert: true}
      );

      if (!counter) {
        throw new Error("Counter document could not be created or updated.");
      }

      const customId = `HVNS-M${year}${month}${counter.count}`;
      this.maintenanceId = customId;
    }
    next();
  } catch (error) {
    next(error);
  }
});

export const Maintenance = mongoose.model("Maintenance", maintenanceSchema);
