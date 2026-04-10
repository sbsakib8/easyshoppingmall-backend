import mongoose from "mongoose";
import processdata from "./index";


const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(processdata.mongodburl, {
      connectTimeoutMS: 10000, // 10s
      socketTimeoutMS: 45000,  // 45s
      maxPoolSize: 10,
    });
    console.log("MongoDB connected successfully");
  } catch (error: any) {
    console.error("MongoDB connection failed:", error.message);
  }
};

export default connectDB;
