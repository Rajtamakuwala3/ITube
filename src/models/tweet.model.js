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
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }]
}, {timestamps : true})

export const Tweet = new mongoose.model("Tweet", tweetSchema) 