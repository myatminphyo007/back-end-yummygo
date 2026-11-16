import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import Reservation from "../models/Reservation.js"
import Slot from "../models/Slot.js"
import Shop from "../models/Shop.js"
import Coupon from "../models/Coupon.js"
import MenuItem from "../models/MenuItem.js"
import getBooked from "../utils/getBooked.js"
import generateCode from "../utils/generateCode.js"
import issueCoupons from "../utils/issueCoupons.js"
import expireOffers from "../utils/expireOffers.js"
import notify from "../utils/notify.js"

// how long a visitor has to answer a suggested time
const OFFER_MINUTES = 15

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "")
const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v || "")

// is the date inside the festival dates?
const insideFestival = (festival, date) => {
    if (!festival?.startDate || !festival?.endDate) return true
    const start = festival.startDate.toISOString().slice(0, 10)
    const end = festival.endDate.toISOString().slice(0, 10)
    return date >= start && date <= end
}

// food pre-order: prices always come from the database
const buildOrder = async (items, shopId, res) => {
    const orderItems = []
    let total = 0

    if (Array.isArray(items) && items.length > 0) {
        const ids = items
            .map((i) => i.menuItemId)
            .filter((id) => mongoose.isValidObjectId(id))

        const menuDocs = await MenuItem.find({ _id: { $in: ids }, shop: shopId })

        for (const i of items) {
            const quantity = Math.floor(Number(i.quantity))
            if (!quantity || quantity < 1) continue

            if (quantity > 20) {
                res.status(400)
                throw new Error("You can order up to 20 of one item")
            }

            const doc = menuDocs.find((d) => d._id.toString() === String(i.menuItemId))
            if (!doc) {
                res.status(400)
                throw new Error("A menu item was not found at this stall")
            }
            if (!doc.available) {
                res.status(400)
                throw new Error(`${doc.name} is sold out`)
            }

            orderItems.push({
                menuItem: doc._id,
                name: doc.name,
                price: doc.price,
                quantity,
            })
            total += doc.price * quantity
        }
    }

    return { orderItems, total }
}

// customer: reserve a listed time slot (with an optional food pre-order)
const createReservation = asyncHandler(async (req, res) => {
    const { slotId, people, note, items } = req.body

    if (!slotId || !people) {
        res.status(400)
        throw new Error("Please add slotId and people")
    }

    const slot = await Slot.findById(slotId)
    if (!slot) {
        res.status(404)
        throw new Error("Slot not found")
    }

    const booked = await getBooked(slot._id)
    const remaining = slot.capacity - booked
    if (remaining <= 0) {
        res.status(400)
        throw new Error("This slot is full")
    }
    if (people > remaining) {
        res.status(400)
        throw new Error(`Only ${remaining} places left in this slot`)
    }

    const already = await Reservation.findOne({
        user: req.user._id,
        slot: slot._id,
        status: { $in: ["pending", "approved"] },
    })
    if (already) {
        res.status(400)
        throw new Error("You already reserved this slot")
    }

    const { orderItems, total } = await buildOrder(items, slot.shop, res)

    const reservation = await Reservation.create({
        user: req.user._id,
        shop: slot.shop,
        slot: slot._id,
        date: slot.date,
        time: slot.time,
        people,
        note,
        code: await generateCode(),
        items: orderItems,
        total,
    })

    // tell the stall owner about the new booking
    const bookedShop = await Shop.findById(slot.shop)
    if (bookedShop) {
        await notify(
            bookedShop.owner,
            "booking.new",
            { name: req.user.name, date: slot.date, time: slot.time, people },
            "/owner"
        )
    }

    res.status(201).json(reservation)
})

// customer: ask for a time that is not in the list
const requestReservation = asyncHandler(async (req, res) => {
    const { shopId, date, time, people, note, items } = req.body

    if (!mongoose.isValidObjectId(shopId) || !date || !time || !people) {
        res.status(400)
        throw new Error("Please add shopId, date, time and people")
    }

    const peopleCount = Math.floor(Number(people))
    if (!peopleCount || peopleCount < 1) {
        res.status(400)
        throw new Error("People must be at least 1")
    }

    if (!isDate(date) || !isTime(time)) {
        res.status(400)
        throw new Error("Please choose a valid date and time")
    }

    const shop = await Shop.findById(shopId).populate("festival", "startDate endDate")
    if (!shop) {
        res.status(404)
        throw new Error("Shop not found")
    }

    if (!insideFestival(shop.festival, date)) {
        res.status(400)
        throw new Error("That date is outside the festival dates")
    }

    const already = await Reservation.findOne({
        user: req.user._id,
        shop: shop._id,
        date,
        time,
        status: { $in: ["pending", "approved", "offered"] },
    })
    if (already) {
        res.status(400)
        throw new Error("You already asked for this time")
    }

    const { orderItems, total } = await buildOrder(items, shop._id, res)

    const reservation = await Reservation.create({
        user: req.user._id,
        shop: shop._id,
        slot: null,
        date,
        time,
        people: peopleCount,
        note,
        code: await generateCode(),
        items: orderItems,
        total,
    })

    await notify(
        shop.owner,
        "booking.new",
        { name: req.user.name, date, time, people: peopleCount },
        "/owner"
    )

    res.status(201).json(reservation)
})

// customer: my reservations (without the ones I deleted)
const getMyReservations = asyncHandler(async (req, res) => {
    await expireOffers({ user: req.user._id })

    const list = await Reservation.find({ user: req.user._id, hiddenByUser: { $ne: true } })
        .populate("shop", "name category image stampRally")
        .populate("slot", "date time")
        .sort({ createdAt: -1 })

    res.status(200).json(list)
})

// customer: cancel my reservation
const cancelReservation = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)

    if (!reservation) {
        res.status(404)
        throw new Error("Reservation not found")
    }

    if (reservation.user.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error("This is not your reservation")
    }

    if (!["pending", "approved", "offered"].includes(reservation.status)) {
        res.status(400)
        throw new Error("This reservation cannot be cancelled")
    }

    reservation.status = "cancelled"
    await reservation.save()

    // tell the stall owner
    const cancelledShop = await Shop.findById(reservation.shop)
    if (cancelledShop) {
        await notify(
            cancelledShop.owner,
            "booking.cancelled",
            { name: req.user.name, code: reservation.code },
            "/owner"
        )
    }

    res.status(200).json(reservation)
})

// customer: accept the time the owner suggested
const acceptOffer = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)

    if (!reservation) {
        res.status(404)
        throw new Error("Reservation not found")
    }

    if (reservation.user.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error("This is not your reservation")
    }

    if (reservation.status !== "offered") {
        res.status(400)
        throw new Error("There is no suggested time to answer")
    }

    if (!reservation.offerExpiresAt || reservation.offerExpiresAt <= new Date()) {
        reservation.status = "cancelled"
        await reservation.save()
        res.status(400)
        throw new Error("This suggestion has expired")
    }

    // the places are already on hold, so no capacity check is needed
    reservation.date = reservation.offerDate
    reservation.time = reservation.offerTime
    reservation.slot = reservation.offerSlot || null
    reservation.status = "approved"
    reservation.offerDate = ""
    reservation.offerTime = ""
    reservation.offerSlot = null
    reservation.offerExpiresAt = null
    await reservation.save()

    const shop = await Shop.findById(reservation.shop)
    if (shop) {
        await notify(
            shop.owner,
            "booking.accepted",
            {
                name: req.user.name,
                date: reservation.date,
                time: reservation.time,
                code: reservation.code,
            },
            "/owner"
        )
    }

    res.status(200).json(reservation)
})

// customer: decline the time the owner suggested
const declineOffer = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)

    if (!reservation) {
        res.status(404)
        throw new Error("Reservation not found")
    }

    if (reservation.user.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error("This is not your reservation")
    }

    if (reservation.status !== "offered") {
        res.status(400)
        throw new Error("There is no suggested time to answer")
    }

    reservation.status = "cancelled"
    await reservation.save()

    const shop = await Shop.findById(reservation.shop)
    if (shop) {
        await notify(
            shop.owner,
            "booking.offerDeclined",
            { name: req.user.name, date: reservation.offerDate, time: reservation.offerTime },
            "/owner"
        )
    }

    res.status(200).json(reservation)
})

// customer: delete one finished reservation from my history
const deleteMyReservation = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)

    if (!reservation) {
        res.status(404)
        throw new Error("Reservation not found")
    }

    if (reservation.user.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error("This is not your reservation")
    }

    if (["pending", "approved", "offered"].includes(reservation.status)) {
        res.status(400)
        throw new Error("Cancel this reservation first, then you can delete it")
    }

    reservation.hiddenByUser = true
    await reservation.save()
    res.status(200).json({ message: "Deleted from your history" })
})

// customer: clear all my finished reservations from my history
const clearMyHistory = asyncHandler(async (req, res) => {
    const result = await Reservation.updateMany(
        {
            user: req.user._id,
            status: { $in: ["completed", "noshow", "declined", "cancelled"] },
            hiddenByUser: { $ne: true },
        },
        { hiddenByUser: true }
    )

    res.status(200).json({ deleted: result.modifiedCount })
})

// owner: reservations of my shop (without the ones I deleted)
const getShopReservations = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    if (!shop) {
        res.status(404)
        throw new Error("You have no shop yet")
    }

    await expireOffers({ shop: shop._id })

    const filter = { shop: shop._id, hiddenByOwner: { $ne: true } }
    if (req.query.status) filter.status = req.query.status

    const list = await Reservation.find(filter)
        .populate("user", "name email")
        .populate("slot", "date time capacity")
        .sort({ createdAt: -1 })

    res.status(200).json(list)
})

// owner: delete one finished reservation from my list
const deleteShopReservation = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    const reservation = await Reservation.findById(req.params.id)

    if (!reservation) {
        res.status(404)
        throw new Error("Reservation not found")
    }

    if (!shop || reservation.shop.toString() !== shop._id.toString()) {
        res.status(403)
        throw new Error("This is not your reservation")
    }

    if (["pending", "approved", "offered"].includes(reservation.status)) {
        res.status(400)
        throw new Error("Only finished reservations can be deleted")
    }

    reservation.hiddenByOwner = true
    await reservation.save()
    res.status(200).json({ message: "Deleted from your list" })
})

// owner: clear all finished reservations from my list
const clearShopHistory = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    if (!shop) {
        res.status(404)
        throw new Error("You have no shop yet")
    }

    const result = await Reservation.updateMany(
        {
            shop: shop._id,
            status: { $in: ["completed", "noshow", "declined", "cancelled"] },
            hiddenByOwner: { $ne: true },
        },
        { hiddenByOwner: true }
    )

    res.status(200).json({ deleted: result.modifiedCount })
})

// owner: approve or decline
const updateReservationStatus = asyncHandler(async (req, res) => {
    const { status } = req.body

    if (!["approved", "declined"].includes(status)) {
        res.status(400)
        throw new Error("Status must be approved or declined")
    }

    const shop = await Shop.findOne({ owner: req.user._id })
    const reservation = await Reservation.findById(req.params.id)

    if (!reservation) {
        res.status(404)
        throw new Error("Reservation not found")
    }

    if (!shop || reservation.shop.toString() !== shop._id.toString()) {
        res.status(403)
        throw new Error("This is not your reservation")
    }

    if (reservation.status !== "pending") {
        res.status(400)
        throw new Error("Only pending reservations can be changed")
    }

    // a listed slot has a limit, a requested free time does not
    if (status === "approved" && reservation.slot) {
        const slot = await Slot.findById(reservation.slot)
        if (slot) {
            const booked = await getBooked(slot._id)
            if (booked + reservation.people > slot.capacity) {
                res.status(400)
                throw new Error("Not enough places left to approve this")
            }
        }
    }

    reservation.status = status
    await reservation.save()

    // tell the visitor
    await notify(
        reservation.user,
        status === "approved" ? "booking.approved" : "booking.declined",
        { shop: shop.name, code: reservation.code },
        "/my-reservations"
    )

    res.status(200).json(reservation)
})

// owner: suggest another time for a pending request
const suggestTime = asyncHandler(async (req, res) => {
    const { date, time } = req.body

    if (!isDate(date) || !isTime(time)) {
        res.status(400)
        throw new Error("Please choose a valid date and time")
    }

    const shop = await Shop.findOne({ owner: req.user._id }).populate(
        "festival",
        "startDate endDate"
    )
    const reservation = await Reservation.findById(req.params.id)

    if (!reservation) {
        res.status(404)
        throw new Error("Reservation not found")
    }

    if (!shop || reservation.shop.toString() !== shop._id.toString()) {
        res.status(403)
        throw new Error("This is not your reservation")
    }

    if (reservation.status !== "pending") {
        res.status(400)
        throw new Error("You can only suggest a time for a pending request")
    }

    if (!insideFestival(shop.festival, date)) {
        res.status(400)
        throw new Error("That date is outside the festival dates")
    }

    // if the time matches one of my slots, its places go on hold
    const slot = await Slot.findOne({ shop: shop._id, date, time })
    if (slot) {
        const booked = await getBooked(slot._id)
        if (booked + reservation.people > slot.capacity) {
            res.status(400)
            throw new Error("That time slot does not have enough places")
        }
    }

    reservation.status = "offered"
    reservation.offerDate = date
    reservation.offerTime = time
    reservation.offerSlot = slot ? slot._id : null
    reservation.offerExpiresAt = new Date(Date.now() + OFFER_MINUTES * 60 * 1000)
    await reservation.save()

    await notify(
        reservation.user,
        "booking.offered",
        { shop: shop.name, date, time, minutes: OFFER_MINUTES },
        "/my-reservations"
    )

    res.status(200).json(reservation)
})

// owner: find one reservation of my shop by its code
const getReservationByCode = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    if (!shop) {
        res.status(404)
        throw new Error("You have no shop yet")
    }

    const reservation = await Reservation.findOne({
        code: req.params.code.toUpperCase(),
        shop: shop._id,
    })
        .populate("user", "name email")
        .populate("slot", "date time")

    if (!reservation) {
        res.status(404)
        throw new Error("Reservation not found")
    }

    res.status(200).json(reservation)
})

// owner: visitor arrived (completed) or did not come (noshow)
const checkInReservation = asyncHandler(async (req, res) => {
    const { result } = req.body

    if (!["completed", "noshow"].includes(result)) {
        res.status(400)
        throw new Error("Result must be completed or noshow")
    }

    const shop = await Shop.findOne({ owner: req.user._id })
    const reservation = await Reservation.findById(req.params.id)

    if (!reservation) {
        res.status(404)
        throw new Error("Reservation not found")
    }

    if (!shop || reservation.shop.toString() !== shop._id.toString()) {
        res.status(403)
        throw new Error("This is not your reservation")
    }

    if (reservation.status !== "approved") {
        res.status(400)
        throw new Error("Only confirmed reservations can be checked in")
    }

    reservation.status = result
    await reservation.save()

    let stampGiven = false
    let progress = 0
    let couponCode = null

    if (result === "completed" && shop.stampRally) {
        stampGiven = true
        const issued = await issueCoupons(reservation.user, shop)
        progress = issued.progress
        couponCode = issued.newCoupons.length > 0 ? issued.newCoupons[0].code : null
    }

    // tell the visitor
    if (result === "noshow") {
        await notify(
            reservation.user,
            "booking.noshow",
            { shop: shop.name, code: reservation.code },
            "/my-reservations"
        )
    } else if (stampGiven) {
        await notify(
            reservation.user,
            "stamp.given",
            { shop: shop.name, n: progress, total: shop.stampsNeeded },
            "/stamps"
        )
        if (couponCode) {
            await notify(
                reservation.user,
                "coupon.made",
                { shop: shop.name, reward: shop.rewardName, code: couponCode },
                "/stamps"
            )
        }
    } else {
        await notify(
            reservation.user,
            "booking.checkedIn",
            { shop: shop.name },
            "/my-reservations"
        )
    }

    res.status(200).json({
        reservation,
        stampGiven,
        progress,
        stampsNeeded: shop.stampsNeeded,
        couponCode,
    })
})

// visitor: stamp cards in progress, and my active coupons
const getMyStamps = asyncHandler(async (req, res) => {
    const stalls = await Shop.find({ stampRally: true }).select(
        "name category image stampsNeeded rewardName"
    )

    const cards = []
    for (const s of stalls) {
        // makes a coupon for every full card that has none yet
        const issued = await issueCoupons(req.user._id, s)

        // a card only shows while it has at least 1 stamp
        if (issued.progress < 1) continue

        cards.push({
            shop: s,
            progress: Math.min(issued.progress, s.stampsNeeded),
            stampsNeeded: s.stampsNeeded,
        })
    }

    const coupons = await Coupon.find({ user: req.user._id, status: "active" })
        .populate("shop", "name image")
        .sort({ createdAt: -1 })

    res.status(200).json({ cards, coupons })
})

// owner: find a coupon of my stall by its code (with or without the FREE- prefix)
const getCouponByCode = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    if (!shop) {
        res.status(404)
        throw new Error("You have no shop yet")
    }

    const raw = req.params.code.toUpperCase().replace(/^FREE-/, "").trim()

    const coupon = await Coupon.findOne({
        code: { $in: [raw, `FREE-${raw}`] },
        shop: shop._id,
    }).populate("user", "name email")

    if (!coupon) {
        res.status(404)
        throw new Error("Coupon not found")
    }

    res.status(200).json(coupon)
})

// owner: the free item was given, so the coupon is used up
const redeemCoupon = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    const coupon = await Coupon.findById(req.params.id)

    if (!coupon) {
        res.status(404)
        throw new Error("Coupon not found")
    }

    if (!shop || coupon.shop.toString() !== shop._id.toString()) {
        res.status(403)
        throw new Error("This is not your coupon")
    }

    if (coupon.status === "used") {
        res.status(400)
        throw new Error("This coupon was already used")
    }

    coupon.status = "used"
    coupon.usedAt = new Date()
    await coupon.save()

    // tell the visitor
    await notify(
        coupon.user,
        "coupon.used",
        { shop: shop.name, reward: coupon.rewardName },
        "/stamps"
    )

    res.status(200).json(coupon)
})

export {
    createReservation,
    requestReservation,
    getMyReservations,
    cancelReservation,
    acceptOffer,
    declineOffer,
    deleteMyReservation,
    clearMyHistory,
    getShopReservations,
    deleteShopReservation,
    clearShopHistory,
    updateReservationStatus,
    suggestTime,
    getReservationByCode,
    checkInReservation,
    getMyStamps,
    getCouponByCode,
    redeemCoupon,
}