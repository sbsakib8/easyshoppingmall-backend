import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

const app = express()

// middlewares 
app.use(cors())
app.use(express.json())


// route




export default app 