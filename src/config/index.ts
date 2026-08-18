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
    mongodburl: process.env.MONGODB_URL || " ",
    pass: process.env.APP_PASS || " ",
    email: process.env.EMAIL || " ",
    receiveremail: process.env.RECEIVER_EMAIL || " ",
    cloudname: process.env.CLOUD_NAME || " ",
    cloudapikey: process.env.CLOUD_API_KEY || " ",
    cloudapisecret: process.env.CLOUD_API_SECRET || " ",
    sslcommerzstoreid: process.env.SSLC_STORE_ID || " ",
    sslcommerzstorepassword: process.env.SSLC_STORE_PASSWORD || " ",
    upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL || "",
    upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
}

export default processdata