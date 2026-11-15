import express from "express"
import protect from "../middleware/authMiddleware.js"
import { customerOnly } from "../middleware/roleMiddleware.js"
import {
    createReview,
    getShopReviews,
    updateReview,
    deleteReview,
} from "../controllers/reviewController.js"

const router = express.Router()

router.get("/shop/:shopId", getShopReviews)

router.post("/", protect, customerOnly, createReview)
router.put("/:id", protect, customerOnly, updateReview)
router.delete("/:id", protect, deleteReview)

export default router