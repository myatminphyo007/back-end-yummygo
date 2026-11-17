import bcrypt from "bcryptjs"
import asyncHandler from "express-async-handler"
import User from "../models/User.js"
import generateToken from "../utils/generateToken.js"

const registerHandler = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
        res.status(400)
        throw new Error("Please add all fields")
    }

    // Only "owner" or "customer" can be chosen at registration.
    // "admin" can never be set from the register form.
    const safeRole = role === "owner" ? "owner" : "customer"

    const userExist = await User.findOne({ email })
    if (userExist) {
        res.status(400)
        throw new Error("User already exists")
    }

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
    const { email, password } = req.body

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

export { registerHandler, loginHandler, updateProfileHandler }