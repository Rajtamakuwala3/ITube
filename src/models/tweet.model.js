import mongoose, { Schema } from "mongoose";
import { type } from "os";

const tweetSchema = new mongoose.Schema({
    owner : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    content : {
        type : String,
        required : true
    }
}, {timestamps : true})

export const Tweet = new mongoose.model("Tweet", tweetSchema) 