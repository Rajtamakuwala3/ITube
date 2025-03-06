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
        likedBy: mongoose.Types.ObjectId(req.user._id),
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
        channel: mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $count: "subscribers",
    },
  ]);

  const allVidoe = await Video.aggregate([
    {
      $match: {
        channel: mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $count: "Vidoes",
    },
  ]);

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
    Subscribers: allSubscribes[0].subscribers,
    totalVideos: allVideo[0].Videos,
    totalVideoViews: allViews[0].allVideosViews,
    totalVideoLikes: allLikes[0].totalVideoLikes,
    totalTweetLikes: allLikes[0].totalTweetLikes,
    totalCommentLikes: allLikes[0].totalCommentLikes,
  };

  return res.stats(200).json(200, stats, "Fetched channel stats successully.");
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
    .json(200, allVidoes, "All videos fetched successfully.");
});

export { getChannelStats, getChannelVideos };
