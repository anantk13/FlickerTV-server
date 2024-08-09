import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "channelId is invalid")
    }
    const user = await User.findById(channelId)
    console.log(user)
    if(!user){
        throw new ApiError(404,"User not found")
    }
    const subscribed = await Subscription.create({
        subscriber: req.user?._id,
        channel: user._id
    });
    if(!subscribed){
        throw new ApiError(400,"Unable to subsribe")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, subscribed, "subscribed successfully")
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid ChannelId")
    }

    const subscribers = await Subscription.aggregate([
        { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
        {
            $lookup: {
                from: 'users',
                localField: 'subscriber',
                foreignField: '_id',
                as: 'subscriberDetails'
            }
        }, 
        { $unwind: '$subscriberDetails' },
        {
            $group: {
                _id: '$channel',
                subscribersCount: { $sum: 1 },
                subscribers: { $push: '$subscriberDetails' }
            }
        },
        {
            $project: {
                _id: 0,
                subscribersCount: 1,
                subscribers: {
                    username: '$subscribers.username',
                    avatar: '$subscribers.avatar'
                }
            }
        }
    ]);

    if(!subscribers){
        throw new ApiError(400,"Unable to fetch subsribers details")
    }
   
    return res
    .status(200)
    .json(
        new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid subscriberId")
    }

    const subscribedChannels = await Subscription.aggregate([
        // Match subscriptions for the given subscriberId
        { $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) } },
        
        // Lookup corresponding channel details
        {
            $lookup: {
                from: 'users', // Collection name for channels
                localField: 'channel',
                foreignField: '_id',
                as: 'channelDetails'
            }
       },
        
        // Unwind the channelDetails array
        { $unwind: '$channelDetails' },

        {
            $group: {
                _id: '$subscriber',
                subscribedChannelsCount: { $sum: 1 },
                channels: { $push: '$channelDetails' }
            }
        },
        
        // Project the required fields
        {
            $project: {
                _id: 0,
                subscribedChannelsCount: 1,
                channels: {
                    username: '$channels.username',
                    avatar: '$channels.avatar'
                }
            }
        }
    ]);
    if(!subscribedChannels){
        throw new ApiError(400,"Unbale fetch subscribedChannels")
    }

    return res.status(200).json(new ApiResponse(
         200,
         subscribedChannels,
        'Subscribed channels retrieved successfully'
    ));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}