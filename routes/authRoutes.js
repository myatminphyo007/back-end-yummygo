import express from "express"
import { registerHandler, loginHandler } from "../controllers/authController.js"
import upload from "../middleware/uploadMiddleware.js"

const router = express.Router()

router.post("/register", upload.single("profileImage"), registerHandler)
router.post("/login", loginHandler)

export default router