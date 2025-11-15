import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import processdata from "../config";

const uploadClouinary = async (file: string): Promise<string> => {
  if (!file) throw new Error("Invalid file path");

  // Cloudinary config
  cloudinary.config({
    cloud_name: processdata.cloudname,
    api_key: processdata.cloudapikey,
    api_secret: processdata.cloudapisecret,
  });

  const resolvedPath = path.resolve(file); 

  try {
    const result = await cloudinary.uploader.upload(resolvedPath, {
      resource_type: "image",
      timeout: 120000, 
    });

   
    if (fs.existsSync(file)) fs.unlinkSync(file);

    return result.secure_url;
  } catch (error) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    console.error("❌ Cloudinary upload failed:", error);
    throw new Error("Cloudinary upload failed");
  }
};

export default uploadClouinary;
