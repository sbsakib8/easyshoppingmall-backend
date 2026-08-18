// cloudinaryUpload.ts
import { v2 as cloudinary } from "cloudinary";
import processdata from "../config";

const uploadCloudinary = async (fileBuffer: Buffer): Promise<string> => {
  if (!fileBuffer) throw new Error("Invalid file buffer");

  cloudinary.config({
    cloud_name: processdata.cloudname,
    api_key: processdata.cloudapikey,
    api_secret: processdata.cloudapisecret,
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload failed:", error);
          return reject(error);
        }
        if (!result || !result.secure_url) {
          return reject(new Error("Cloudinary upload returned no URL"));
        }
        resolve(result.secure_url); 
      }
    );

    uploadStream.end(fileBuffer);
  });
};
export default uploadCloudinary;
