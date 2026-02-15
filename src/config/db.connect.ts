import mongoose from "mongoose";
import processdata from "./index";


const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(processdata.mongodburl, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5,  // Keep 5 connections warm
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5s
      heartbeatFrequencyMS: 10000, // Check server status every 10s
    });
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
