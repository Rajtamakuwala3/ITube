import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pipeline } from "stream";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = rew.body;
  if (content?.trim() === "") {
    throw new ApiError(400, "Content is missing.");
  }

  try {
    await Tweet.create({
      content: content,
      // owner: new mongoose.Types.ObjectId(req.user?._id),
      owner: req.user?._id,
    });
  } catch (error) {
    throw new ApiError(500, "Something went wrong while creating Tweet.");
  }

  return res.status(200).json(200, {}, "Tweet uploaded succesfully");
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(401, "Invalid tweetId");
  }

  const tweet = Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(`${userID}`),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "details",
        pipeline: [
          {
            $project: {
              avatar: 1,
              fullname: 1,
            },
          },
        ],
      },
    },
    {
      addFields: {
        details: {
          $first: "$details",
        },
        likes: {
          $size: "$NumLikes",
        },
      },
    },
  ]);

  if (!tweets.length) {
    throw new ApiError(401, "Tweets not found.");
    // return "Tweets not found.";
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched succesfully !!"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const tweetId = req.params;
  const content = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(401, "Invalid tweetid");
  }

  const response = Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!response) {
    throw new ApiError(500, "Something is wrong while updating tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Tweet is updated succesfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const tweetId = rew.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(401, "Invalid TweetId");
  }

  const response = Tweet.findByIdAndDelete(tweetId);

  if (!response) {
    throw new ApiError(401, "Something went wrong while deleting tweet.");
  }

  return res
    .status(200)
    .json(new ApiError(200, response, "Tweet is deleted succesfully."));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
