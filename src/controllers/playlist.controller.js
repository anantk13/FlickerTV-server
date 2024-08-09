import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description , videos = []} = req.body
    //TODO: create playlist
     console.log(req.body)
    if (
        [name, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "name, description are required")
    }

    const  user = req.user?._id
    if(!isValidObjectId(user)){
        throw new ApiError(404,"user not found")
    }
    // console.log(validVideos.length )
    // console.log(videos.length )
    const validVideos = await Video.find({
        _id: { $in: videos },  // Ensure this is correct
        owner: user               // Ensure this matches the field in your Video schema
    });
    // console.log(validVideos.length )
    // console.log(videoIds.length )

    if (validVideos.length !== videos.length) {
        throw new ApiError(400, "Some videos are not valid or do not belong to the user");
    }
   console.log(validVideos)
    const playlist = await Playlist.create({
        name,
        description,
        videos:validVideos,  
        owner:user
    })
    //(validVideos.map(video => video._id)) for taking only videoId
    if(!playlist){
        throw new ApiError(400,"Unable to create playlist")
}

    return res.status(200).json(new ApiResponse(
        200,
        playlist,
        "Playlist created successfully"
    ));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId)){
        throw new ApiError(404,"user not found")
    }
    

    const playlist = await Playlist.find({owner:userId}).populate('videos')
    if(!playlist){
        throw new ApiError(400,"Unable to fetch playlist")
    }

    return res.status(200).json(new ApiResponse(
        200,
        playlist,
        "Playlist fetched successfully"
    ));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!isValidObjectId(playlistId)){
        throw new ApiError(404,"playlist not found")
    }

    const playlist = await Playlist.findById(playlistId).populate('videos')
    if(!playlist){
        throw new ApiError(400,"Unbale to fetch playlist")
    }

    return res.status(200).json(new ApiResponse(
        200,
        playlist,
        "Playlist fetched successfully"
    ));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const user = req.user?._id;

    // Validate playlistId and videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlistId or videoId");
    }

    // Check if playlist exists and belongs to the user
    const playlist = await Playlist.findOne({ _id: playlistId, owner: user });
    if (!playlist) {
        throw new ApiError(404, "Playlist not found or does not belong to the user");
    }

    // Check if video exists and belongs to the user
    const video = await Video.findOne({ _id: videoId, owner: user });
    if (!video) {
        throw new ApiError(404, "Video not found or does not belong to the user");
    }

    // Add video to playlist if not already added
    if (!playlist.videos.includes(videoId)) {
        playlist.videos.push(videoId);
        await playlist.save();
    } else {
        throw new ApiError(400, "Video already exists in the playlist");
    }

    return res.status(200).json(new ApiResponse(
        200,
        playlist,
        "Video added to playlist successfully"
    ));
});


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const user = req.user?._id;

    // Validate playlistId and videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlistId or videoId");
    }

    // Check if playlist exists and belongs to the user
    const playlist = await Playlist.findOne({ _id: playlistId, owner: user });
    if (!playlist) {
        throw new ApiError(404, "Playlist not found or does not belong to the user");
    }

    // Check if video exists in the playlist
    const videoIndex = playlist.videos.indexOf(videoId);
    if (videoIndex === -1) {
        throw new ApiError(404, "Video not found in the playlist");
    }

    // Remove video from playlist
    playlist.videos.splice(videoIndex, 1);
    await playlist.save();

    return res.status(200).json(new ApiResponse(
        200,
        playlist,
        "Video removed from playlist successfully"
    ));
});


const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(404,"playlist not found")
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId)
    if(!playlist){
        throw new ApiError(400,"Error in deleting playlist")
    }

    return res.status(200).json(new ApiResponse(
        200,
        playlist,
        "Playlist deleted successfully"
    ));

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(404,"playlist not found")
    }

    if (
        [name, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "name, description are required")
    }

    const playlist = await Playlist.findByIdAndUpdate(playlistId,
        {
            name,
            description
        }
    )
    if(!playlist){
        throw new ApiError(400,"Unable to update details")
    }

    return res.status(200).json(new ApiResponse(
        200,
        playlist,
        "Playlist updated successfully"
    ));

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
