import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
  getNextVideos,
  updateVideoViews,
  getVideoByIdForGuest,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Get all videos with optional search
router.route("/").get(getAllVideos);

// Publish video
router
  .route("/")
  .post(
    verifyJWT,
    upload.fields([
      { name: "video", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    publishAVideo
  );

// Video by ID
router
  .route("/v/:videoId")
  .get(verifyJWT, getVideoById)
  .delete(verifyJWT, deleteVideo)
  .patch(verifyJWT, upload.single("thumbnail"), updateVideo);

// Toggle publish
router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);

// Next videos
router.route("/next/:videoId").get(getNextVideos);

// Guest access
router.route("/v/guest/:videoId").get(getVideoByIdForGuest);

// Update views
router.route("/update/views/:videoId").patch(verifyJWT, updateVideoViews);

export default router;
