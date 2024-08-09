import mongoose, { isValidObjectId } from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const { channelId } = req.params;
       if(!isValidObjectId(channelId)){
         throw new ApiError(400,"Invalid channelId")
       }
    
        // Aggregate total videos, views, and likes
        const videoStats = await Video.aggregate([
            { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
            {
                $lookup: {
                    from: 'videos', // The name of the video collection
                    localField: 'video', // Field in the Like collection
                    foreignField: '_id', // Field in the Video collection
                    as: 'videoDetails'
                }
            },
                {
            $group: {
                    _id: null,
                    totalVideos: { $sum: 1 },
                    totalViews: { $sum: '$views' },
                    totalLikes: { $sum: '$videoDetails.likes' },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalVideos: 1,
                    totalViews: 1,
                    totalLikes: 1
                }
            }
        ]);
        if(!videoStats){
            throw new ApiError(400,"Unable to fetch video stats")
        }

        // Aggregate total subscribers
        const subscriberStats = await Subscription.aggregate([
            { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
            {
                $group: {
                    _id: null,
                    totalSubscribers: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalSubscribers: 1
                }
            }
        ]);
        if(!subscriberStats){
            throw new ApiError(400,"Unable to fetch subscriber stats")
        }

        const totalVideos = videoStats[0]?.totalVideos || 0;
        const totalViews = videoStats[0]?.totalViews || 0;
        const totalLikes = videoStats[0]?.totalLikes || 0;
        const totalSubscribers = subscriberStats[0]?.totalSubscribers || 0;

        return res.status(200).json(new ApiResponse(
                200,
                totalVideos,
                totalViews,
                totalLikes,
                totalSubscribers,
                'Channel stats retrieved successfully'
        ));
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { channelId } = req.params;
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channelId")
      }

        // Find all videos by the channel
        const videos = await Video.find({ channel: new mongoose.Types.ObjectId(channelId) });

        if (!videos.length) {
            return res.status(404).json({
                status: 'fail',
                message: 'No videos found for this channel'
            });
        }

        return res.status(200).json(new ApiResponse(
             'success',
              videos,
              'Videos retrieved successfully'
        ));
})

export {
    getChannelStats, 
    getChannelVideos
    }