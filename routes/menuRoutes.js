import express from "express"
import protect from "../middleware/authMiddleware.js"
import { ownerOnly } from "../middleware/roleMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"
import {
  createMenuItem,
  getShopMenu,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menuController.js"

const router = express.Router()

router.get("/shop/:shopId", getShopMenu)

router.post("/", protect, ownerOnly, upload.single("image"), createMenuItem)
router.put("/:id", protect, ownerOnly, upload.single("image"), updateMenuItem)
router.delete("/:id", protect, ownerOnly, deleteMenuItem)

export default router