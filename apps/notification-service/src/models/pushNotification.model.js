import mongoose from "mongoose";

const pushNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    messOnly: {
      type: Boolean,
      required: true,
      default: false,
    },
    studentOnly: {
      type: Boolean,
      required: true,
      default: false,
    },
    workerOnly: {
      type: Boolean,
      required: true,
      default: false,
    },
    dailyRentOnly: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const PushNotification = mongoose.model(
  "PushNotification",
  pushNotificationSchema
);
export default PushNotification;
