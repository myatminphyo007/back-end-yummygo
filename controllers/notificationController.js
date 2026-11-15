import asyncHandler from "express-async-handler"
import Notification from "../models/Notification.js"

// my latest notifications and the unread count
const getMyNotifications = asyncHandler(async (req, res) => {
    const list = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30)

    const unread = await Notification.countDocuments({ user: req.user._id, read: false })

    res.status(200).json({ list, unread })
})

// mark one notification as read
const markRead = asyncHandler(async (req, res) => {
    await Notification.updateOne(
        { _id: req.params.id, user: req.user._id },
        { read: true }
    )
    res.status(200).json({ message: "ok" })
})

// mark all as read
const markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true })
    res.status(200).json({ message: "ok" })
})

// delete all my notifications
const clearAll = asyncHandler(async (req, res) => {
    await Notification.deleteMany({ user: req.user._id })
    res.status(200).json({ message: "ok" })
})

export { getMyNotifications, markRead, markAllRead, clearAll }