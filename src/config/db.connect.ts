import mongoose from "mongoose";
import processdata from "./index";

const connectDB = async (): Promise<void> => {
  // Use mongoose's built-in connection states
  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  try {
    await mongoose.connect(processdata.mongodburl, {
      maxPoolSize: 10,
    });

    console.log("✅ MongoDB connected");
  } catch (error: any) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;