import mongoose from "mongoose";
import processdata from "./index";

let isConnected = false;

const connectDB = async (): Promise<void> => {
  if (isConnected) return;

  try {
    const db = await mongoose.connect(processdata.mongodburl, {
      serverSelectionTimeoutMS: 30000,
      maxPoolSize: 10,
    });

    isConnected = db.connections[0].readyState === 1;

    console.log("✅ MongoDB connected");
  } catch (error: any) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error; // 🔥 important
  }
};

export default connectDB;