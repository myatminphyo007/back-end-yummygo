import express from "express"
import protect from "../middleware/authMiddleware.js"
import { customerOnly } from "../middleware/roleMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"
import {
    createReview,
    getShopReviews,
    updateReview,
    deleteReview,
} from "../controllers/reviewController.js"

const router = express.Router()

// up to 3 photos in the "photos" field
const reviewPhotos = upload.array("photos", 3)

router.get("/shop/:shopId", getShopReviews)

router.post("/", protect, customerOnly, reviewPhotos, createReview)
router.put("/:id", protect, customerOnly, reviewPhotos, updateReview)
router.delete("/:id", protect, deleteReview)

export default router