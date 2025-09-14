import dontenv from "dotenv"
dontenv.config()
interface data {
    jwtsecret : string
    mongodburl: string
}
const processdata : data ={
    jwtsecret: process.env.JWT_SECRET || " ",
    mongodburl: process.env.MONGODB_URL || " "
}

export default processdata