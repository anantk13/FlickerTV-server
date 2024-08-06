import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build the query object
    let queryObj = {};
    if (query) {
        queryObj = {
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        };
    }

    if (userId) {
        queryObj.user = userId;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortType === 'asc' ? 1 : -1;

        // Get total count of documents that match the query
        const totalVideos = await Video.countDocuments(queryObj);
        if(!totalVideos){
            throw new ApiError(500,"Unable to get total count of docs")
        }

        // Fetch videos based on query, sort, and pagination
        const videos = await Video.find(queryObj)
            .sort(sortOptions)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
            if(!videos){
                throw new ApiError(500,"Unable to fetch videos")
            }

        return res.status(200).json({
            page: pageNum,
            limit: limitNum,
            totalVideos,
            totalPages: Math.ceil(totalVideos / limitNum),
            videos
        });
})

const publishAVideo = asyncHandler(async (req, res) => {

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if (
        [title, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "title, description are required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    // let coverImageLocalPath;
    // if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path
    // }
    
    if (!videoLocalPath) {
        throw new ApiError(400, "video is required")
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile) {
        throw new ApiError(400, "video is required")
    }
    if (!thumbnail) {
        throw new ApiError(400, "thumbnail is required")
    }
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title, 
        description,
        owner:req.user?._id,
        duration:videoFile.duration
    })

    return res.status(201).json(
        new ApiResponse(200, video, "Video uploaded")
    )
    
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "videoId is invalid")
    }
    const video = await Video.findById(videoId)
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        video,
        "Video fetched successfully"
    ))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title , description} = req.body
    //TODO: update video details like title, description, thumbnail
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "videoId is invalid")
    }
    // const vid = await Video.findById(videoId)
    
    const thumbnailLocalPath = req.file?.path
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is missing")
    }

    // const deletethumbnail = await deleteOnCloudinary(vid.thumbnail)
    // if (!deletethumbnail) {
    //     throw new ApiError(400, "Error in deleting old thumbnail")
        
    // }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!thumbnail.url) {
        throw new ApiError(400, "Error while uploading on thumbnail")
        
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail:thumbnail.url
            }
        },
        {new: true}
        
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Avatar image updated successfully")
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "videoId is invalid")
    }
      const delVideo = await Video.findByIdAndDelete(videoId)
      if(!delVideo){
            throw new ApiError(400, "Error while deleting video")
      }
      return res
    .status(200)
    .json(
        new ApiResponse(200, delVideo, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "videoId is invalid")
    }
    const video = await Video.findById(videoId)

    const updateVideo = await Video.findByIdAndUpdate(
        videoId,
        {
                $set: {
                    isPublished:!video?.isPublished
                }
            },
            {new: true}
    )
    if(!updateVideo){
        throw new ApiError(400,"status not updated")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, updateVideo, "Publish status updated")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
