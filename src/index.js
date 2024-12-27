// require('dotenv').config({path: './env'});
import dotenv from "dotenv"
import connectDb from "./db/dbConnect.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})

connectDb()
.then(() => {
    app.on("Error", (error) => {
        console.log("ERROR : ", error)
        throw error
    })
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server is running at port ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.log("MongoDB connection failed", error);
}) 