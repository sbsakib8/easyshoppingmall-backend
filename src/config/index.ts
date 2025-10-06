import dontenv from "dotenv"
dontenv.config()
interface data {
    jwtsecret : string
    mongodburl: string
    pass : string
    email : string
    cloudname :string;
    cloudapikey:string;
    cloudapisecret:string
}
const processdata : data ={
    jwtsecret: process.env.JWT_SECRET || "sjdtkfyg7t87tvyg97yuhu98",
    mongodburl: process.env.MONGODB_URL || " ",
    pass : process.env.APP_PASS || " ",
    email : process.env.EMAIL || " ",
    cloudname: process.env.CLOUD_NAME || " ",
    cloudapikey: process.env.CLOUD_API_KEY || " ",
    cloudapisecret: process.env.CLOUD_API_SECRET || " ",
}

export default processdata