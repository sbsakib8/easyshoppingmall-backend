import app from "./index.js"
import dotenv from "dotenv"
dotenv.config()


const port = process.env.PORT || 4000


app.get("/", (req, res) => {
  res.send("Server is sakib sarkar running!")
})

app.listen(port, () => {
  console.log("Server running on port 5000")
})
