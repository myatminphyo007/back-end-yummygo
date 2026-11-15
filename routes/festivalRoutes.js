import express from "express"
import protect from "../middleware/authMiddleware.js"
import { adminOnly } from "../middleware/roleMiddleware.js"
import {
  createFestival,
  getFestivals,
  getFestival,
  updateFestival,
  deleteFestival,
} from "../controllers/festivalController.js"

const router = express.Router()

router.get("/", getFestivals)
router.get("/:id", getFestival)

router.post("/", protect, adminOnly, createFestival)
router.put("/:id", protect, adminOnly, updateFestival)
router.delete("/:id", protect, adminOnly, deleteFestival)

export default router