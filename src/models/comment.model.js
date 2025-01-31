import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { type } from "os";

const commentSchema = new mongoose.Schema ({
    content : {
        type : String,
        required : true
    },
    video : {
        type : Schema.Types.ObjectId,
        ref : "Video"
    },
    owner : {
        type : Schema.Types.ObjectId,
        ref : "User"
    }
}, {timestamps : true})

videoSchema.plugin(mongooseAggregatePaginate)

export const comment = new mongoose.model("Comment", commentSchema);