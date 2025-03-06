import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    const userId = req.user?._id

    if((!name || name?.trim() === "") || (!description || description?.trim() === "")) {
        throw new ApiError(400, "name and description both are required.")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner : userId
    })

    if(!playlist) {
        throw new ApiError(500, "Something went while creating playlist")
    }

    return res.status(200)
    .json(200, playlist, "Playlist created successfully")
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "UserId is Invalid")
    }

    const playlists = await Playlist.aggregate([
        {
            $match : {
                owner : mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from:"videos",
                localField:"vidoes",
                foreignField:"_id",
                as: "videosDetails"
            }
        },
        {
            $addFields: {
                playlist:{
                    $first: "videosDetails"
                }
            }
        }
    ])

    if(!playlists) {
        throw new ApiError(500, "something went wrong while fetching playlists")
    }

    throw res.status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully!!"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "PlaylistId is invalid")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist) {
        throw new ApiError(500, "Something when wrong while fetching Playlist")
    }

    return res.status(200)
    .json(200,  playlist, "Playlist fetched successfully!!")

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "This playlist is is not valid")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "This video id is not valid")
    }

    const playlist = await Playlist.findBtId(playlistId)

    if (!playlist) {
        throw new ApiError(404, "no playlist found!");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to add video in this playlist!");
    }
    // find video in db
    const video = await Video.findById( videoId )

    if (!video) {
        throw new ApiError(404, "no video found!");
    }

    // if video already exists in playlist 
    if(playlist.video.includes(videoId)){
        throw new ApiError(400, "video already exists in this playlist!!");
    }

    const addedToPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push:{
                video : videoId
            }
        },
        {
            new : true
        }
    )

    if(!addedToPlaylist) {
        throw new ApiError(500, "Something whent wrong while adding video to playlist !!")
    }

    return res.status(200)
    .json(200, addedToPlaylist, "Video added successfully in playlist.")
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.body

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "This playlist is is not valid")
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "This video id is not valid")
    }

    const playlist = await Playlist.findBtId(playlistId)

    if (!playlist) {
        throw new ApiError(404, "no playlist found!");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to remove video in this playlist!");
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404, "no video found!");
    }

    if(!Playlist.video.includes(videoId)) {
        throw new ApiError(400, "Video not exists in this playlist.")
    }

    const removeVideoFromPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull : {
                video : videoId
            }
        },
        {new : true}
    )

    if(!removeVideoFromPlaylist) {
        throw new ApiError(500, "Something whent wrong while removing video from playlist!!")
    }

    return res.status(200)
    .json(200, removeVideoFromPlaylist, "Video is removed successfully from playlist")
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "This playlistId is not valid")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist) {
        throw new ApiError(404, "Playlist not found")
    } 

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to delete this playlist")
    }
    
    const deletePlaylist = await Playlist.deleteOne({_id : playlistId})

    if(!deletePlaylist) {
        throw new ApiError(500, "Something whent wrong while deleting a playlist!!")
    }

    return res.status(200)
    .json(200, deletePlaylist, "Playlist deleted successfully")
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {NewName, NewDescription} = req.body

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "PlaylistID is invalid")
    }

    if((!NewName || NewName?.trim() === "") || (!NewDescription || NewDescription?.trim() === '')) {
        throw new ApiError(400, "Either name or description is required")
    }

    const playlist = await Playlist.findById(playlistId) 

    if(!playlist) {
        throw new ApiError(404, "Playlist not found!!")
    }

    if(playlist.owner.toString() !== req.user._id.toString) {
        throw new ApiError(400, "You don't have permisson to update this playllist!")
    }

    const updateData = {}
    if(NewName) {
        updateData.name = NewName
    }
    if(NewDescription) {
        updateData.description = NewDescription
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {$set : updateData},
        {new : true}
    )

    if(updatePlaylist) {
        throw new ApiError(500, "Something whent wrong while updating playlist!")
    }

    return res.status(200)
    .json(200, updatePlaylist, "Playlist updated successfully!!")
 }) 

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}