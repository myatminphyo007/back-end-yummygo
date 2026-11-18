import bcrypt from "bcryptjs"
import asyncHandler from "express-async-handler"
import User from "../models/User.js"
import generateToken from "../utils/generateToken.js"
import { issueCode, verifyCode } from "../utils/emailCode.js"

const MIN_PASSWORD = 6
const cleanEmail = (v) => String(v || "").trim().toLowerCase()
const pickLang = (v) => (["en", "ja", "my", "ko"].includes(v) ? v : "en")

const checkPassword = (res, password) => {
    if (!password || String(password).length < MIN_PASSWORD) {
        res.status(400)
        throw new Error(`Password must be at least ${MIN_PASSWORD} characters`)
    }
}

// step 1 of sign up: email me a code (only if the email is not used yet)
const sendRegisterCodeHandler = asyncHandler(async (req, res) => {
    const email = cleanEmail(req.body.email)
    if (!email || !email.includes("@")) {
        res.status(400)
        throw new Error("Please enter a valid email")
    }

    if (await User.findOne({ email })) {
        res.status(400)
        throw new Error("This email is already registered")
    }

    await issueCode(email, "register", pickLang(req.body.lang), res)
    res.json({ message: "Code sent" })
})

// step 2 of sign up: the form + the code
const registerHandler = asyncHandler(async (req, res) => {
    const { name, password, role, code } = req.body
    const email = cleanEmail(req.body.email)

    if (!name || !email || !password) {
        res.status(400)
        throw new Error("Please add all fields")
    }
    checkPassword(res, password)

    // Only "owner" or "customer" can be chosen at registration.
    // "admin" can never be set from the register form.
    const safeRole = role === "owner" ? "owner" : "customer"

    const userExist = await User.findOne({ email })
    if (userExist) {
        res.status(400)
        throw new Error("User already exists")
    }

    // the email must be proven with the code that was mailed
    await verifyCode(email, "register", code, res)

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    const profileImage = req.file ? req.file.path : ""

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: safeRole,
        profileImage
    })

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage,
            token: generateToken(user._id)
        })
    } else {
        res.status(400)
        throw new Error("Invalid user data")
    }
})

const loginHandler = asyncHandler(async (req, res) => {
    const { password } = req.body
    const email = cleanEmail(req.body.email)

    if (!email || !password) {
        res.status(400)
        throw new Error("Please add all fields")
    }

    const user = await User.findOne({ email })
    if (user && (await bcrypt.compare(password, user.password))) {
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage,
            token: generateToken(user._id)
        })
    } else {
        res.status(401)
        throw new Error("Invalid email or password")
    }
})

// forgot password, step 1: email a code (same answer whether the email exists or not)
const forgotPasswordHandler = asyncHandler(async (req, res) => {
    const email = cleanEmail(req.body.email)
    if (!email || !email.includes("@")) {
        res.status(400)
        throw new Error("Please enter a valid email")
    }

    const user = await User.findOne({ email })
    if (user) {
        await issueCode(email, "reset", pickLang(req.body.lang), res)
    }

    res.json({ message: "If that email is registered, a code has been sent." })
})

// forgot password, step 2: code + new password
const resetPasswordHandler = asyncHandler(async (req, res) => {
    const email = cleanEmail(req.body.email)
    const { code, newPassword } = req.body

    checkPassword(res, newPassword)
    await verifyCode(email, "reset", code, res)

    const user = await User.findOne({ email })
    if (!user) {
        res.status(400)
        throw new Error("Wrong code")
    }

    user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10))
    await user.save()

    res.json({ message: "Password changed" })
})

// change password (logged in), step 1: email a code to my own address
const sendChangeCodeHandler = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id || req.user.id)
    if (!user) {
        res.status(404)
        throw new Error("User not found")
    }

    await issueCode(user.email, "change", pickLang(req.body.lang), res)
    res.json({ message: "Code sent" })
})

// change password (logged in), step 2: current password + code + new password
const changePasswordHandler = asyncHandler(async (req, res) => {
    const { currentPassword, code, newPassword } = req.body

    const user = await User.findById(req.user._id || req.user.id)
    if (!user) {
        res.status(404)
        throw new Error("User not found")
    }

    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        res.status(400)
        throw new Error("Current password is wrong")
    }

    checkPassword(res, newPassword)
    await verifyCode(user.email, "change", code, res)

    user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10))
    await user.save()

    res.json({ message: "Password updated" })
})

// edit my own name and photo (works for owner, customer and admin)
const updateProfileHandler = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id || req.user.id)
    if (!user) {
        res.status(404)
        throw new Error("User not found")
    }

    if (req.body.name !== undefined) {
        const name = String(req.body.name).trim()
        if (!name) {
            res.status(400)
            throw new Error("Name cannot be empty")
        }
        if (name.length > 40) {
            res.status(400)
            throw new Error("Name is too long (40 characters max)")
        }
        user.name = name
    }

    if (req.file) {
        user.profileImage = req.file.path
    } else if (req.body.removeImage === "true") {
        user.profileImage = ""
    }

    await user.save()

    // no token here: the browser keeps the one it already has
    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
    })
})

export {
    registerHandler,
    loginHandler,
    updateProfileHandler,
    sendRegisterCodeHandler,
    forgotPasswordHandler,
    resetPasswordHandler,
    sendChangeCodeHandler,
    changePasswordHandler
}
