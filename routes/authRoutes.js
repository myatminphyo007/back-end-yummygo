import express from "express"
import {
    registerHandler,
    loginHandler,
    updateProfileHandler,
    sendRegisterCodeHandler,
    forgotPasswordHandler,
    resetPasswordHandler,
    sendChangeCodeHandler,
    changePasswordHandler
} from "../controllers/authController.js"
import protect from "../middleware/authMiddleware.js"
import upload from "../middleware/uploadMiddleware.js"

const router = express.Router()

router.post("/send-code", sendRegisterCodeHandler)
router.post("/register", upload.single("profileImage"), registerHandler)
router.post("/login", loginHandler)

router.post("/forgot", forgotPasswordHandler)
router.post("/reset", resetPasswordHandler)

router.put("/profile", protect, upload.single("profileImage"), updateProfileHandler)
router.post("/password/send-code", protect, sendChangeCodeHandler)
router.put("/password", protect, changePasswordHandler)

export default router
