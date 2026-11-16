import asyncHandler from "express-async-handler"
import Slot from "../models/Slot.js"
import Shop from "../models/Shop.js"
import Reservation from "../models/Reservation.js"
import getBooked from "../utils/getBooked.js"

// "2026-12-12T00:00:00.000Z" -> "2026-12-12"
const dayOnly = (d) => {
    if (!d) return ""
    if (typeof d === "string") return d.slice(0, 10)
    return new Date(d).toISOString().slice(0, 10)
}

// owner: add a time slot to my shop
const createSlot = asyncHandler(async (req, res) => {
    const { date, time, capacity } = req.body

    if (!date || !time || !capacity) {
        res.status(400)
        throw new Error("Please add date, time and capacity")
    }

    const shop = await Shop.findOne({ owner: req.user._id }).populate(
        "festival",
        "name startDate endDate"
    )
    if (!shop) {
        res.status(404)
        throw new Error("Create your shop first")
    }

    // the date must be inside the festival days
    const start = dayOnly(shop.festival?.startDate)
    const end = dayOnly(shop.festival?.endDate)
    const day = dayOnly(date)

    if (start && day < start) {
        res.status(400)
        throw new Error(`The festival starts on ${start}`)
    }
    if (end && day > end) {
        res.status(400)
        throw new Error(`The festival ends on ${end}`)
    }

    const exists = await Slot.findOne({ shop: shop._id, date, time })
    if (exists) {
        res.status(400)
        throw new Error("This time slot already exists")
    }

    const slot = await Slot.create({ shop: shop._id, date, time, capacity })
    res.status(201).json(slot)
})

// anyone: slots of a shop, with how many places are left
const getShopSlots = asyncHandler(async (req, res) => {
    const slots = await Slot.find({ shop: req.params.shopId }).sort({ date: 1, time: 1 })

    const result = await Promise.all(
        slots.map(async (slot) => {
            const booked = await getBooked(slot._id)
            const remaining = slot.capacity - booked
            return {
                _id: slot._id,
                shop: slot.shop,
                date: slot.date,
                time: slot.time,
                capacity: slot.capacity,
                remaining,
                full: remaining <= 0,
            }
        })
    )

    res.status(200).json(result)
})

// owner: delete one of my slots (only if no active reservations)
const deleteSlot = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    const slot = await Slot.findById(req.params.id)

    if (!slot) {
        res.status(404)
        throw new Error("Slot not found")
    }

    if (!shop || slot.shop.toString() !== shop._id.toString()) {
        res.status(403)
        throw new Error("This is not your slot")
    }

    const active = await Reservation.findOne({
        $or: [{ slot: slot._id }, { offerSlot: slot._id }],
        status: { $in: ["pending", "approved", "offered"] },
    })
    if (active) {
        res.status(400)
        throw new Error("This slot has active reservations")
    }

    await slot.deleteOne()
    res.status(200).json({ message: "Slot deleted" })
})

export { createSlot, getShopSlots, deleteSlot }