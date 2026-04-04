import mongoose from "mongoose";
import processdata from "./index";


const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(processdata.mongodburl);
    console.log("MongoDB connected successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("MongoDB connection failed:", error.message);
    } else {
      console.error("MongoDB connection failed: unknown error");
    }
    // process.exit(1) should not be used in serverless context like Vercel
  }
};

export default connectDB;
