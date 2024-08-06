import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    if (
        [content].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "content is required")
    }
    // const user = await User.findById()
    const tweet = await Tweet.create({
        content,
        owner:req.user?._id
    })

    return res.status(201).json(
        new ApiResponse(200, tweet, "Tweet uploaded")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

        const { userId } = req.params;
        const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query;
    
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        const user = await User.findById(userId)
        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;
    
        // Find the tweets for the user, with pagination and sorting
        const tweets = await Tweet.find({ owner: userId })
            .sort({ [sortBy]: sortType === 'asc' ? 1 : -1 })
            .skip(skip)
            .limit(Number(limit));
    
        // Count total number of tweets for the user
        const totalTweets = await Tweet.countDocuments({ owner: userId });
    
        // Calculate total pages
        const totalPages = Math.ceil(totalTweets / limit);

        res.status(200).json(
            new ApiResponse(200, {
                tweets,
                username:user.username,
                pagination: {
                    totalTweets,
                    totalPages,
                    currentPage: Number(page),
                    pageSize: Number(limit)
                }
            }, "User tweets retrieved successfully"
        )
        )
    
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const {content} = req.body
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweetId");
    }
    if (
        [content].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "content is required")
    }
    const tweet = await Tweet.findByIdAndUpdate(tweetId,{
        $set: {
            content
        }
    })

    if(!tweet){
        throw new ApiError(400,"Error in updating tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, tweet, "Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweetId");
    }

   const tweet = await Tweet.findByIdAndDelete(tweetId)

   if(!tweet){
    throw new ApiError(400,"Error in deleting tweet")
}

return res
.status(200)
.json(
    new ApiResponse(200, tweet, "Tweet deleted successfully")
)

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
