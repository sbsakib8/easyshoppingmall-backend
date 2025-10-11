import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import processdata from "../config";

// ✅ Type-safe cloudinary uploader
const uploadClouinary = async (file: string): Promise<string> => {
  if (!file) throw new Error("Invalid file path");

  // Cloudinary config
  cloudinary.config({
    cloud_name: processdata.cloudname,
    api_key: processdata.cloudapikey,
    api_secret: processdata.cloudapisecret,
  });

  try {
    const result = await cloudinary.uploader.upload(file);
    if (fs.existsSync(file)) fs.unlinkSync(file); // cleanup local file
    return result.secure_url;
  } catch (error) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    console.error("❌ Cloudinary upload failed:", error);
    throw new Error("Cloudinary upload failed");
  }
};

export default uploadClouinary;
