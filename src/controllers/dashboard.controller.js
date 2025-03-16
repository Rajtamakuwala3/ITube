import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { channel } from "diagnostics_channel";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  //total likes
  const allLikes = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $group: {
        _id: null,
        totalVideoLikes: {
          $sum: {
            $cond: [
              { $ifNull: ["$video", false] },
              1, // not null then add 1
              0, // else 0
            ],
          },
        },
        totalTweetLikes: {
          $sum: {
            $cond: [{ $ifNull: ["$tweet", false] }, 1, 0],
          },
        },
        totalCommentLikes: {
          $sum: {
            $cond: [{ $ifNull: ["$comment", false] }, 1, 0],
          },
        },
      },
    },
  ]);

  // total subscriber
  const allSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $count: "subscribers",
    },
  ]);

  // const allVideos = await Video.aggregate([
  //   {
  //     $match: {
  //       channel: new mongoose.Types.ObjectId(req.user._id),
  //     },
  //   },
  //   {
  //     $count: "Vidoes",
  //   },
  // ]);

  // Total videos - let's debug this to fix the count
  const allVideos = await Video.find({
    owner: new mongoose.Types.ObjectId(req.user._id)
  });
  
  const videoCount = allVideos ? allVideos.length : 0;

  // Log to debug
  // console.log("Found videos:", videoCount);
  // console.log("Video owner ID:", req.user._id);

  // total views
  const allViews = await Video.aggregate([
    {
      $match: {
        videoOwner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $group: {
        _id: null,
        allVideosViews: {
          $sum: "$views",
        },
      },
    },
  ]);

  const stats = {
    Subscribers: allSubscribers && allSubscribers[0] ? allSubscribers[0].subscribers : 0,
    // totalVideos: allVideos && allVideos[0] ? allVideos[0].totalVideos : 0,
    totalVideos: videoCount,
    totalVideoViews: allViews && allViews[0] ? allViews[0].allVideosViews : 0,
    totalVideoLikes: allLikes && allLikes[0] ? allLikes[0].totalVideoLikes : 0,
    totalTweetLikes: allLikes && allLikes[0] ? allLikes[0].totalTweetLikes : 0,
    totalCommentLikes: allLikes && allLikes[0] ? allLikes[0].totalCommentLikes : 0,
  };

  return res.status(200).json(new ApiResponse(200, stats, "Fetched channel stats successully."));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const allVidoes = await Video.find({
    owner: req.user._id,
  });

  if (!allVidoes) {
    throw new ApiError(
      500,
      "Something whent wrong while fetching all videos of channel!"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, allVidoes, "All videos fetched successfully."));
});

export { getChannelStats, getChannelVideos };
