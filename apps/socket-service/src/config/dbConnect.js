import mongoose from "mongoose";

export const dbConnect = async () => {
  try {
    console.log("Mongo socket", process.env.SOCKET_MONGO_URI);
    await mongoose.connect(process.env.SOCKET_MONGO_URI);
    console.log("Connected to db");
  } catch (err) {
    console.log("Error while connecting to db");
    process.exit(1);
  }
};
