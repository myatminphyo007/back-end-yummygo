import express from "express"
import protect from "../middleware/authMiddleware.js"
import { ownerOnly } from "../middleware/roleMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"
import {
    createShop,
    getMyShop,
    updateMyShop,
    deleteMyShop,
    getShops,
    getShop,
} from "../controllers/shopController.js"

const router = express.Router()

// 1 main photo ("image") and up to 3 location photos ("gallery")
const shopPhotos = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 3 },
])

router.get("/", getShops)

// "/my" must come BEFORE "/:id", or Express reads "my" as an id
router.get("/my", protect, ownerOnly, getMyShop)
router.post("/", protect, ownerOnly, shopPhotos, createShop)
router.put("/my", protect, ownerOnly, shopPhotos, updateMyShop)
router.delete("/my", protect, ownerOnly, deleteMyShop)

router.get("/:id", getShop)

export default router