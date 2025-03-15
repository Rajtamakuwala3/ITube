import mongoose, { isValidObjectId, Model } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pipeline } from "stream";

const toggleLike = async (Model, resourceId, userId) => {
  const model = Model.modelName.toLowerCase();

  if (!isValidObjectId(resourceId) || !isValidObjectId(userId)) {
    throw new ApiError(401, "Invalid userId or ResourceId");
  }

  const isLiked = await Like.findOne({
    [model.toLowerCase()]: resourceId,
    likedBy: userId,
  });
  let response;

  try {
    if (!isLiked) {
      response = await Like.create({
        [model.toLowerCase()]: resourceId,
        likedBy: userId,
      });
    } else {
      response = await Like.findOneAndDelete({
        [model.toLowerCase()]: resourceId,
        likedBy: userId,
      });
    }
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong in ToggleLike."
    );
  }

  const totalLikes = await Like
  .countDocuments({
    [model.toLowerCase()]: resourceId,
  });

  return { response, isLiked, totalLikes };
};

const toggleVideoLike = asyncHandler(async (req, res) => {

  // console.log(req.params)
  // console.log(req.user._id)
  const { videoId } = req.params;
  //TODO: toggle like on video
  const userId = req.user._id;
  // console.log(videoId, userId)

  const {isLiked, totalLikes } = toggleLike(Video, videoId, userId);

  return res
    .status(200)
    .json(
      200,
      { totalLikes },
      !isLiked ? "Liked Succesfully" : "Liked removed Succesfully"
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on video
  const  userId  = req.user._id;

  const { isLiked, totalLikes } = toggleLike(Comment, commentId, userId);

  return res
    .status(200)
    .json(
      200,
      { totalLikes },
      !isLiked ? "Liked Succesfully" : "Liked removed Succesfully"
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on video
  const  userId  = req.user._id;

  const { isLiked, totalLikes } = toggleLike(Tweet, tweetId, userId);

  return res
    .status(200)
    .json(
      200,
      { totalLikes },
      !isLiked ? "Liked Succesfully" : "Liked removed Succesfully"
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const userId = req.user?._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(401, "Invalid UserId");
  }

  const likedVideo = await Like.aggregate([
    {
      $match: {
        $and: [
          { likedBy: new mongoose.Types.ObjectId(`${userId}`) },
          { video: { $exists: true } },
        ],
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        details: {
          $first: "$video",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideo, "Succesfully fetched liked videos"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
