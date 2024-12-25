// require('dotenv').config({path: './env'});
import dotenv from "dotenv"
import connectDb from "./db/dbConnect.js";

dotenv.config({
    path: './env'
})

connectDb();