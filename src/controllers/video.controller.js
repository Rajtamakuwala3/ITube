import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { title } from "process";

const getAllVideos = asyncHandler(async (req, res) => {
  const { 
      page = 1, 
      limit = 10, 
      query, 
      sortBy, 
      sortType = "desc", 
      userId 
  } = req.query;

  // Validate pagination parameters
  const pageNumber = Math.max(1, parseInt(page));
  const limitNumber = Math.min(100, Math.max(1, parseInt(limit))); // Add upper limit
  const skip = (pageNumber - 1) * limitNumber;

  // Initialize match stage with published videos
  const matchStage = {
      $match: {
          isPublished: true
      }
  };

  // Add search query if provided
  if (query?.trim()) {
      matchStage.$match.$or = [
          { title: { $regex: query.trim(), $options: "i" } },
          { description: { $regex: query.trim(), $options: "i" } }
      ];
  }

  // Add user filter if provided
  if (userId) {
      if (!isValidObjectId(userId)) {
          throw new ApiError(400, "Invalid userId format");
      }
      matchStage.$match.owner = new mongoose.Types.ObjectId(userId);
  }

  // Define valid sort fields and orders
  const validSortFields = new Set(['views', 'createdAt', 'duration']);
  const validSortOrders = new Set(['asc', 'desc']);

  // Initialize sort stage with default sorting
  const sortStage = {
      $sort: {
          createdAt: -1 // Default sort
      }
  };

  // Apply custom sorting if valid
  if (sortBy && validSortFields.has(sortBy)) {
      const sortOrder = validSortOrders.has(sortType) ? (sortType === "desc" ? -1 : 1) : -1;
      sortStage.$sort = {
          [sortBy]: sortOrder
      };
  }

  try {
      const pipeline = [
          matchStage,
          {
              $lookup: {
                  from: "users",
                  let: { ownerId: "$owner" },
                  pipeline: [
                      {
                          $match: {
                              $expr: { $eq: ["$_id", "$$ownerId"] }
                          }
                      },
                      {
                          $project: {
                              username: 1,
                              avatar: 1,
                              fullname: 1
                          }
                      }
                  ],
                  as: "owner"
              }
          },
          {
              $unwind: {
                  path: "$owner",
                  preserveNullAndEmptyArrays: false
              }
          },
          {
              $project: {
                  videoFile: 1,
                  thumbnail: 1,
                  title: 1,
                  description: 1,
                  duration: 1,
                  views: 1,
                  createdAt: 1,
                  owner: 1
              }
          },
          sortStage,
          {
              $facet: {
                  metadata: [
                      { $count: "totalVideos" },
                      {
                          $addFields: {
                              currentPage: pageNumber,
                              totalPages: {
                                  $ceil: {
                                      $divide: ["$totalVideos", limitNumber]
                                  }
                              },
                              videosPerPage: limitNumber
                          }
                      }
                  ],
                  videos: [
                      { $skip: skip },
                      { $limit: limitNumber }
                  ]
              }
          }
      ];

      const [result] = await Video.aggregate(pipeline).exec();

      const response = {
          success: true,
          data: {
              videos: result.videos || [],
              metadata: result.metadata[0] || {
                  totalVideos: 0,
                  currentPage: pageNumber,
                  totalPages: 0,
                  videosPerPage: limitNumber
              }
          }
      };

      return res.status(200).json(
          new ApiResponse(
              200,
              response,
              "Videos fetched successfully"
          )
      );

  } catch (error) {
      throw new ApiError(
          error.statusCode || 500,
          error.message || "Error while fetching videos"
      );
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  // Check title and description got properly
  // get thumbnail and video file path properly
  // uplaod on cloudinary and check uploaded properly
  // get duration from response
  // create a video response

  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title or Description is missing");
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video is missing");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is missing");
  }

  // Better approach : If uploadOnCloudinary(videoLocalPath) fails, the thumbnail upload still happens.
  //             Fix : Use Promise.all() to parallelize uploads and handle failures better.
  const [videoFile, thumbnail] = await Promise.all([
    uploadOnCloudinary(videoLocalPath),
    uploadOnCloudinary(thumbnailLocalPath),
  ]);

  // const videoFile = await uploadOnCloudinary(videoLocalPath)
  // const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

  if (!videoFile || !thumbnail) {
    throw new ApiError(
      500,
      "Someting went wrong while uploding video file or thumbnail"
    );
  }

  const duration = videoFile.duration;

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: duration,
    owner: req.user._id,
    views: 0,
    isPublished: true,
  });

  if (!video) {
    throw new ApiError(500, "Video is not Created properly");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video uploded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId.");
  }

  const videoUrl = await Video.findById(videoId);

  if (!videoUrl) {
    throw new ApiError(400, "Failed to get video details");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videoUrl, "video details fetched Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId.");
  }

  const thumbnailLocalPath = req.file?.path;

  // console.log(thumbnailLocalPath)
  let thumbnailUrl;

  if (!title && !description && !thumbnailLocalPath) {
    throw new ApiError(400, "Title , description or thumbnail is required");
  }

  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail.url) {
      throw new ApiError(500, "Error while updating thumbnail.");
    }
    thumbnailUrl = thumbnail.url;
  }
  
  const updatedFields = {};
  if (title) updatedFields.title = title;
  if (description) updatedFields.description = description;
  if (thumbnailUrl) updatedFields.thumbnail = thumbnailUrl;

  const response = await Video.findByIdAndUpdate(
    videoId,
    { $set: updatedFields },
    { new: true }
  );


  // const response = Video.findByIdAndUpdate(
  //   videoId,
  //   {
  //     $set: {
  //       title,
  //       description,
  //       thumbnail: thumbnail.url,
  //     },
  //   },
  //   { new: true }
  // );

  if (!response) {
    throw new ApiError(401, "Video details not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Video details updated succesfully."));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const videoId = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid vedioId");
  }

  const deleteResponse = await Video.deleteOne({
    _id: ObjectId(`${videoId}`),
  });

  console.log("Printing the delete response", deleteResponse);
  console.log("Acknowledged resonse, ", deleteResponse.acknowledged);
  if (!deleteResponse.acknowledged) {
    throw new ApiError(400, "Error while deleting video from db");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleteResponse, "Video deleted succesfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(401, "VideoId is invalid");
  }

  const response = await Video.findById(videoId);

  if (!response) {
    throw new ApiError(401, "Video not found");
  }

  response.isPublished = !response.isPublished;

  await response.save({ validateBeforeSave: false });

  return res.status(200).json(200, response, "Published Toggled succesfully");
});

export {
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getAllVideos,
};
