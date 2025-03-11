import mongoose, { Schema } from "mongoose";

const playlistSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    describtion: {
      type: String,
      required: true,
    },
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Playlist = new mongoose.model("Playlist", playlistSchema);
