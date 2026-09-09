import dotenv from "dotenv"
dotenv.config()
interface data {
    jwtsecret: string
    mongodburl: string
    pass: string
    email: string
    receiveremail: string
    cloudname: string;
    cloudapikey: string;
    cloudapisecret: string;
    sslcommerzstoreid: string;
    sslcommerzstorepassword: string;
    upstashRedisUrl: string;
    upstashRedisToken: string;
}
const processdata: data = {
    jwtsecret: process.env.JWT_SECRET || "sjdtkfyg7t87tvyg97yuhu98",
    mongodburl: (process.env.MONGODB_URL || "").trim(),
    pass: (process.env.APP_PASS || "").replace(/\s+/g, "").trim(),
    email: (process.env.EMAIL || "").trim(),
    receiveremail: (process.env.RECEIVER_EMAIL || "").trim(),
    cloudname: (process.env.CLOUD_NAME || "").trim(),
    cloudapikey: (process.env.CLOUD_API_KEY || "").trim(),
    cloudapisecret: (process.env.CLOUD_API_SECRET || "").trim(),
    sslcommerzstoreid: (process.env.SSLC_STORE_ID || "").trim(),
    sslcommerzstorepassword: (process.env.SSLC_STORE_PASSWORD || "").trim(),
    upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL || "",
    upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
}

export default processdata