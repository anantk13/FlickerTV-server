import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10,sortBy = 'createdAt', sortType = 'desc'} = req.query
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }
        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid videoId");
        }

        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;

        // Count total number of tweets for the user
        const totalComments = await Comment.countDocuments({video: videoId});
    
        // Find the tweets for the user, with pagination and sorting
        const comments = await Comment.find({video: videoId})
            .sort({ [sortBy]: sortType === 'asc' ? 1 : -1 })
            .skip(skip)
            .limit(Number(limit));
    

        res.status(200).json(
            new ApiResponse(200, {
                comments,
                totalComments,
                username:req.user?.username,
                pagination: {
                    currentPage: Number(page),
                    pageSize: Number(limit)
                }
            }, "User tweets retrieved successfully"
        )
        )

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {content} = req.body
    const {videoId} = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }
    if (
        [content].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "content is required")
    }
    const video = await Video.findById(videoId)
    const comment = await Comment.create({
        content,
        video:video._id,
        owner:req.user?._id
    })
    // console.log(videoId)
    if(!comment){
        throw new ApiError(400,"Unable to create a comment")
    }

    return res.status(201).json(
        new ApiResponse(200, comment, "Tweet uploaded")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params
    const {content} = req.body
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid commentId");
    }
    if (
        [content].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "content is required")
    }
    const comment = await Comment.findByIdAndUpdate(commentId,{
        $set: {
            content
        }
    })

    if(!comment){
        throw new ApiError(400,"Error in updating comment")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, comment, "comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid commentId");
    }

   const comment = await Comment.findByIdAndDelete(commentId)

   if(!comment){
    throw new ApiError(400,"Error in deleting tweet")
}

return res
.status(200)
.json(
    new ApiResponse(200, comment, "Tweet deleted successfully")
)

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }
