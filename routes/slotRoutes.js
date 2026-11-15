import express from "express"
import protect from "../middleware/authMiddleware.js"
import { ownerOnly } from "../middleware/roleMiddleware.js"
import { createSlot, getShopSlots, deleteSlot } from "../controllers/slotController.js"

const router = express.Router()

router.get("/shop/:shopId", getShopSlots)
router.post("/", protect, ownerOnly, createSlot)
router.delete("/:id", protect, ownerOnly, deleteSlot)

export default router