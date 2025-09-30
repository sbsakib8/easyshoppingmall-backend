import dontenv from "dotenv"
dontenv.config()
interface data {
    jwtsecret : string
    mongodburl: string
    pass : string
    email : string
}
const processdata : data ={
    jwtsecret: process.env.JWT_SECRET || "sjdtkfyg7t87tvyg97yuhu98",
    mongodburl: process.env.MONGODB_URL || " ",
    pass : process.env.APP_PASS || " ",
    email : process.env.EMAIL || " "
}

export default processdata