import express from "express"
import protect from "../middleware/authMiddleware.js"
import {
    getMyNotifications,
    markRead,
    markAllRead,
    clearAll,
} from "../controllers/notificationController.js"

const router = express.Router()

router.get("/", protect, getMyNotifications)
router.put("/read-all", protect, markAllRead)
router.delete("/", protect, clearAll)
router.put("/:id/read", protect, markRead)

export default router