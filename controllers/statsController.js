import asyncHandler from "express-async-handler"
import Reservation from "../models/Reservation.js"
import Shop from "../models/Shop.js"
import Coupon from "../models/Coupon.js"

// owner: statistics of my stall
const getMyStats = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    if (!shop) {
        res.status(404)
        throw new Error("You have no shop yet")
    }

    const reservations = await Reservation.find({ shop: shop._id }).populate("slot", "date time")

    // counts per status
    const byStatus = {
        pending: 0,
        approved: 0,
        completed: 0,
        noshow: 0,
        declined: 0,
        cancelled: 0,
    }
    for (const r of reservations) byStatus[r.status] += 1

    // visitors and income
    const checkedInVisitors = reservations
        .filter((r) => r.status === "completed")
        .reduce((sum, r) => sum + r.people, 0)

    const orderIncome = reservations
        .filter((r) => r.status === "completed")
        .reduce((sum, r) => sum + (r.total || 0), 0)

    // bookings per day: the last 7 days (by the day the booking was made)
    const days = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        days.push({ date: key, count: 0 })
    }
    for (const r of reservations) {
        const key = r.createdAt.toISOString().slice(0, 10)
        const day = days.find((d) => d.date === key)
        if (day) day.count += 1
    }

    // bookings per time slot (for example 11:00, 12:00)
    const timeMap = {}
    for (const r of reservations) {
        if (!r.slot) continue
        timeMap[r.slot.time] = (timeMap[r.slot.time] || 0) + 1
    }
    const byTime = Object.entries(timeMap)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time))

    // popular dishes (cancelled and declined bookings don't count)
    const dishMap = {}
    for (const r of reservations) {
        if (["cancelled", "declined", "noshow"].includes(r.status)) continue
        for (const item of r.items || []) {
            dishMap[item.name] = (dishMap[item.name] || 0) + item.quantity
        }
    }
    const dishes = Object.entries(dishMap)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

    // coupons
    const couponsMade = await Coupon.countDocuments({ shop: shop._id })
    const couponsUsed = await Coupon.countDocuments({ shop: shop._id, status: "used" })

    res.status(200).json({
        shopName: shop.name,
        totalBookings: reservations.length,
        byStatus,
        checkedInVisitors,
        stampsGiven: shop.stampRally ? byStatus.completed : 0,
        stampRally: shop.stampRally,
        couponsMade,
        couponsUsed,
        orderIncome,
        avgRating: shop.avgRating,
        reviewCount: shop.reviewCount,
        days,
        byTime,
        dishes,
    })
})

export { getMyStats }