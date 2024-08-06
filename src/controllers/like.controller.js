import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Tweet } from "../models/tweet.model.js"
import { Comment } from "../models/comment.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "videoId is invalid")
    }
    const video = await Video.findById(videoId)
    const newLike = new Like({
        video: video._id,
        likedBy: req.user?._id, 
    });
    if(!newLike){
        throw new ApiError(400,"Unable to handle like video details")
    }

    const savedLike = await newLike.save();

    if(!savedLike){
        throw new ApiError(400,"Unable to process like video")
    }
    
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, savedLike, "Video Liked successfully")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "commentId is invalid")
    }
    const comment = await Comment.findById(commentId)
    const newLike = new Like({
        comment: comment._id,
        likedBy: req.user?._id, // Assuming you want to track the user who liked the video
    });
    if(!newLike){
        throw new ApiError(400,"Unable to handle like comment details")
    }

    const savedLike = await newLike.save();

    if(!savedLike){
        throw new ApiError(400,"Unable to process like comment")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, savedLike, "comment Liked successfully")
    )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "tweetId is invalid")
    }
    const tweet = await Tweet.findById(tweetId)
    const newLike = new Like({
        tweet: tweet._id,
        likedBy: req.user?._id, // Assuming you want to track the user who liked the video
    });
    if(!newLike){
        throw new ApiError(400,"Unable to handle like tweet details")
    }

    const savedLike = await newLike.save();

    if(!savedLike){
        throw new ApiError(400,"Unable to process like tweet")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, savedLike, "comment Liked successfully")
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user?._id; // Ensure this is an ObjectId

    // Fetch likes by the current user and populate video details
    const likes = await Like.find({ likedBy: userId }).populate('video');

    // Check if the user has liked any videos
    if (!likes || likes.length === 0) {
        throw new ApiError(404, 'No liked videos found');
    }

    // Extract video details
    const likedVideos = likes.map(like => like.video);

    return res
    .status(200)
    .json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    )

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}