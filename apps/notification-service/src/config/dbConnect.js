import mongoose from "mongoose";

export const dbConnect = async () => {
  try {
    await mongoose.connect(process.env.NOTIFICATION_MONGO_URI);
    console.log("Connected to db");
  } catch (err) {
    console.log("Error while connecting to db");
    process.exit(1);
  }
};
