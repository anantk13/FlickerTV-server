import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { video_upOptions, thumbnail_upOptions } from "../constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

export const getAllVideos = async (req, res) => {
  try {
    const { query } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const PAGE_SIZE = 10;

    let videos;

    if (query) {
      // Search using Atlas Full-Text Search
      videos = await Video.aggregate([
        {
          $search: {
            index: "default", // your Atlas search index
            text: {
              query,
              path: ["title", "description"], // fields to search
            },
          },
        },
        { $skip: (page - 1) * PAGE_SIZE },
        { $limit: PAGE_SIZE },
        { $project: { title: 1, description: 1, thumbnail: 1, createdAt: 1 } },
      ]);
    } else {
      // No search → return all videos paginated
      videos = await Video.find({})
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .select("title description thumbnail createdAt");
    }

    res.status(200).json({ videos });
  } catch (err) {
    console.error("getAllVideos Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getVideoByIdForGuest = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim()) throw new ApiError(400, "Video Id is missing");

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid VideoID");

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: false,
            },
          },
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              subscribersCount: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: false,
      },
    },
    {
      $project: {
        "video.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!video) throw new ApiError(404, "Video not found");

  return res.status(200).json(new ApiResponse(200, video[0], "Video found"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const isGuest = req.query.guest === "true";

  if (!videoId?.trim()) throw new ApiError(400, "Video Id is missing");
  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid VideoID");

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: isGuest,
                  then: false,
                  else: {
                    $cond: {
                      if: {
                        $in: [req.user?._id, "$subscribers.subscriber"],
                      },
                      then: true,
                      else: false,
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              fullName: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: isGuest,
            then: false,
            else: {
              $cond: {
                if: { $in: [req.user?._id, "$likes.likedBy"] },
                then: true,
                else: false,
              },
            },
          },
        },
      },
    },
    {
      $project: {
        "video.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        isSubscribed: 1,
        subscribersCount: 1,
      },
    },
  ]);

  if (!video.length) throw new ApiError(404, "Video not found");

  return res.status(200).json(new ApiResponse(200, video[0], "Video found"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  const currentVideo = await Video.findById(videoId);

  if (!currentVideo) throw new ApiError(401, "Video cannot be found");
  if (
    [title, description].some(
      (field) => field === undefined || field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (currentVideo?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't edit this video as you are not the owner"
    );
  }

  let update = {
    $set: {
      title,
      description,
    },
  };

  // If a new thumbnail was provided, add it to the update object
  if (thumbnailLocalPath) {
    const thumbnailFile = await uploadOnCloudinary(
      thumbnailLocalPath,
      thumbnail_upOptions
    );

    if (!thumbnailFile) throw new ApiError(501, "Thumbnail uploading failed");

    await deleteFromCloudinary(currentVideo?.thumbnail.fileId);

    update.$set.thumbnail = {
      fileId: thumbnailFile.public_id,
      url: thumbnailFile.secure_url,
    };
  }

  const video = await Video.findByIdAndUpdate(videoId, update, {
    new: true,
  });

  if (!video) throw new ApiError(501, "Updating Video failed");

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const currentVideo = await Video.findById(videoId);

  if (!currentVideo) throw new ApiError(404, "Video not found");

  const deleteVideo = await Video.findByIdAndDelete(videoId);

  if (!deleteVideo) throw new ApiError(500, "Video deletion failed");

  // delete video likes, comments and cloudinary files in parallel
  await Promise.all([
    Like.deleteMany({ video: videoId }),
    Comment.deleteMany({ video: videoId }),
    deleteFromCloudinary(currentVideo?.video.fileId),
    deleteFromCloudinary(currentVideo?.thumbnail.fileId),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "Video not found");

  video.isPublished = !video.isPublished;

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video publish status updated"));
});

const getNextVideos = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "Video not found");

  const nextVideos = await Video.aggregate([
    {
      $match: {
        _id: {
          $ne: new mongoose.Types.ObjectId(videoId),
        },
        isPublished: true,
      },
    },
    {
      $sample: {
        size: 10,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails",
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, nextVideos, "Next videos fetched successfully"));
});

const updateVideoViews = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Find the user and check if they've watched this video before
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const watchHistoryEntry = user.watchHistory.find(
    (entry) => entry.video.toString() === videoId
  );

  if (!watchHistoryEntry) {
    // User hasn't watched this video before
    // Increment view count
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    // Add to watch history
    user.watchHistory.push({
      video: videoId,
      watchedAt: new Date(),
    });

    await user.save();
  } else {
    // User has watched this video before, just update the watchedAt
    watchHistoryEntry.watchedAt = new Date();
    await user.save();
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { video, user }, "Video views updated successfully")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getNextVideos,
  updateVideoViews,
  getVideoByIdForGuest,
};