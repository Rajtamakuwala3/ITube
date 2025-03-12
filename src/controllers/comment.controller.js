import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  let getAllCommetns;

  try {
    // Validate videoId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid VideoId");
    }

    const getAllComments = await Comment.aggregate([
      {
        $match: {
          video: mongoose.Types.ObjectId(videoId), // Ensure ObjectId conversion
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
                fullname: 1,
                avatar: 1,
                username: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id", // Fix: Should match comment ID, not owner
          foreignField: "comment",
          as: "likes",
        },
      },
      {
        $addFields: {
          details: { $first: "$details" },
          likes: { $size: "$likes" }, // Count likes
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort by latest comments
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ]);

    if (!getAllComments.length) {
      return res.status(200).json(new ApiResponse(200, [], "No Comments Found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, getAllComments, "Comments fetched successfully!"));
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw new ApiError(500, "Something went wrong while fetching comments!");
  }
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(401, "Invalid videoId");
  }

  const response = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!response) {
    throw new ApiError(400, "Somthing went wrong while adding comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Succesfully added comment."));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { comment } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(401, "Invalid CommentId");
  }

  const response = await Comment.findByIdAndUpdate(
    commentId,
    {
      content: comment,
    },
    { new: true }
  );

  if (!response) {
    throw new ApiError(401, "Somrthing went wrong while updating comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(401, "Invalid CommentId");
  }

  const response = await Comment.findByIdAndDelete(commentId);

  if (!response) {
    throw new ApiError(401, "Something went wrong while deleting comment");
  }

  return res.status(200).json(200, response, "Comment deleted successfully");
});

export { getVideoComments, addComment, updateComment, deleteComment };
