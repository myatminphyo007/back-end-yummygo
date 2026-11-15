import express from "express"
import protect from "../middleware/authMiddleware.js"
import { ownerOnly } from "../middleware/roleMiddleware.js"
import { getMyStats } from "../controllers/statsController.js"

const router = express.Router()

router.get("/my", protect, ownerOnly, getMyStats)

export default router