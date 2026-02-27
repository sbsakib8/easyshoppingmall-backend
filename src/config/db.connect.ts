import mongoose from "mongoose";
import processdata from "./index";


const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(processdata.mongodburl);
    console.log("MongoDB connected successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("MongoDB connection failed:", error.message);
    } else {
      console.error("MongoDB connection failed: unknown error");
    }
    process.exit(1); 
  }
};

export default connectDB;
