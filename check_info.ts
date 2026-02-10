import mongoose from "mongoose";
import WebsiteInfo from "./src/models/content/websiteInfo/websiteinfo.model";
import dotenv from "dotenv";

dotenv.config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || "");
        const info = await WebsiteInfo.findOne();
        console.log("Website Info:", JSON.stringify(info, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkData();
