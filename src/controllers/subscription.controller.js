import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { channel, subscribe } from "diagnostics_channel";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(401, "ChannelId id invalid");
  }

  // if its a chhannel so its already a user
  const channel = await User.findById({
    _id: channelId,
  });

  if (!channel) {
    throw new ApiError(400, "This channel does not Exists");
  }

  let subscribe;
  let unsubscribe;

 // Check if user is already subscribed
 const existingSubscription = await Subscription.findOne({
  subscriber: req.user?._id,  // Changed from 'subscribe' to 'subscriber'
  channel: channelId,
});

  if (existingSubscription) {
    unsubscribe = await Subscription.findOneAndDelete({
      channel: channelId,
      subscriber: req.user?.id,
    });

    if (!unsubscribe) {
      throw new ApiError(
        500,
        "something went wrong while unscubscribe the channel"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, unsubscribe, "channel unsubscribed successfully!!")
      );
  } else {
    subscribe = await Subscription.create({
      channel: channelId,
      subscriber: req.user?.id,
    });

    if (!subscribe) {
      throw new ApiError(
        500,
        "something went wrong while scubscribe the channel"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, subscribe, "channel subscribed successfully!!")
      );
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(401, "ChannelId is Invalid");
  }

  const subscriptions = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(channelId?.trim()),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
      },
    },
    {
      $unwind: "$subscribers" // Unwind to get individual subscriber objects
    },
    {
      $project: {
        _id: 1,
        subscriberId: "$subscribers._id",
        username: "$subscribers.username",
        fullName: "$subscribers.fullName",
        avatar: "$subscribers.avatar",
      },
    },
  ]);

  // console.log(subscriptions)

  const subscriberList = subscriptions.length;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscriberList,
        subscriptions,
      },
      "All user channel Subscribes fetched Successfull!!"
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {

  // console.log(req.params);
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "subscriberId is Invalid");
  }

  const subscriptions = await Subscription.aggregate([
    {
      // in this case i am a subcriber i want to find channel id so
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannel",
      },
    },
    {
      $project: {
        subscribedChannel: {
          username: 1,
          avatar: 1,
        },
      },
    },
  ]);

  console.log(subscriptions);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptions,
        "All Subscribed channels fetched Successfull!!"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
