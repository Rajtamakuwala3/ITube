import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new mongoose.Schema ({
    subscriber : {
        type : mongoose.Schema.Types.ObjectId, // one who is subscribing 
        ref : "User"
    },
    channel : {
        type : mongoose.Schema.Types.ObjectId, // one to whome 'subscriber' is subscribing
        ref : "User"
    }
}, {timestamps: true})

export const subscription = new mongoose.model("Subscription", subscriptionSchema);