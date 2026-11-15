import asyncHandler from "express-async-handler"
import Shop from "../models/Shop.js"
import Festival from "../models/Festival.js"
import MenuItem from "../models/MenuItem.js"
import Slot from "../models/Slot.js"
import Reservation from "../models/Reservation.js"
import Review from "../models/Review.js"
import Coupon from "../models/Coupon.js"

const MAX_GALLERY = 3

// files of one field when the route uses upload.fields(...)
const getFiles = (req, name) => (req.files && req.files[name]) || []

// owner: create my shop (only one allowed)
const createShop = asyncHandler(async (req, res) => {
    const {
        festival,
        name,
        category,
        description,
        stampRally,
        stampsNeeded,
        rewardName,
        locationNote,
    } = req.body

    if (!festival || !name) {
        res.status(400)
        throw new Error("Please add festival and name")
    }

    const festivalExist = await Festival.findById(festival)
    if (!festivalExist) {
        res.status(404)
        throw new Error("Festival not found")
    }

    const alreadyHasShop = await Shop.findOne({ owner: req.user._id })
    if (alreadyHasShop) {
        res.status(400)
        throw new Error("You already have a shop")
    }

    const image = getFiles(req, "image")[0]?.path || ""
    const gallery = getFiles(req, "gallery").map((f) => f.path).slice(0, MAX_GALLERY)

    const shop = await Shop.create({
        owner: req.user._id,
        festival,
        name,
        category,
        description,
        image,
        gallery,
        locationNote: (locationNote || "").slice(0, 200),
        stampRally: stampRally === "true" || stampRally === true,
        stampsNeeded: Math.min(20, Math.max(1, Number(stampsNeeded) || 3)),
        rewardName: rewardName || "",
    })

    res.status(201).json(shop)
})

// owner: get my shop
const getMyShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id }).populate("festival", "name place")

    if (!shop) {
        res.status(404)
        throw new Error("You have no shop yet")
    }

    res.status(200).json(shop)
})

// owner: edit my shop
const updateMyShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })

    if (!shop) {
        res.status(404)
        throw new Error("You have no shop yet")
    }

    const {
        festival,
        name,
        category,
        description,
        stampRally,
        stampsNeeded,
        rewardName,
        locationNote,
        keepGallery,
    } = req.body

    if (festival) shop.festival = festival
    if (name) shop.name = name
    if (category !== undefined) shop.category = category
    if (description !== undefined) shop.description = description
    if (stampRally !== undefined) shop.stampRally = stampRally === "true" || stampRally === true
    if (stampsNeeded !== undefined) {
        shop.stampsNeeded = Math.min(20, Math.max(1, Number(stampsNeeded) || 3))
    }
    if (rewardName !== undefined) shop.rewardName = rewardName
    if (locationNote !== undefined) shop.locationNote = locationNote.slice(0, 200)

    const newImage = getFiles(req, "image")[0]
    if (newImage) shop.image = newImage.path

    // location photos: keep the ones the owner did not remove, then add the new ones
    if (keepGallery !== undefined) {
        let keep = []
        try {
            keep = JSON.parse(keepGallery)
        } catch (err) {
            keep = []
        }
        // only photos that really belong to this shop can be kept
        keep = keep.filter((url) => shop.gallery.includes(url))

        const added = getFiles(req, "gallery").map((f) => f.path)

        if (keep.length + added.length > MAX_GALLERY) {
            res.status(400)
            throw new Error(`You can have up to ${MAX_GALLERY} location photos`)
        }

        shop.gallery = [...keep, ...added]
    }

    const updated = await shop.save()
    res.status(200).json(updated)
})

// owner: delete my shop, so I can create a new one for a new festival
const deleteMyShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })

    if (!shop) {
        res.status(404)
        throw new Error("You have no shop yet")
    }

    const activeBookings = await Reservation.countDocuments({
        shop: shop._id,
        status: { $in: ["pending", "approved"] },
    })
    if (activeBookings > 0) {
        res.status(400)
        throw new Error(
            `You still have ${activeBookings} pending or confirmed booking(s). Finish them first.`
        )
    }

    const activeCoupons = await Coupon.countDocuments({ shop: shop._id, status: "active" })
    if (activeCoupons > 0) {
        res.status(400)
        throw new Error(`You still have ${activeCoupons} unused coupon(s). Redeem them first.`)
    }

    await Promise.all([
        MenuItem.deleteMany({ shop: shop._id }),
        Slot.deleteMany({ shop: shop._id }),
        Review.deleteMany({ shop: shop._id }),
        Coupon.deleteMany({ shop: shop._id }),
        Reservation.deleteMany({ shop: shop._id }),
    ])

    await shop.deleteOne()

    res.status(200).json({ message: "Shop deleted" })
})

// anyone: list shops (optional ?festival=ID)
const getShops = asyncHandler(async (req, res) => {
    const filter = req.query.festival ? { festival: req.query.festival } : {}
    const sort = req.query.sort === "rating" ? { avgRating: -1, reviewCount: -1 } : { createdAt: -1 }

    const shops = await Shop.find(filter).sort(sort).populate("festival", "name place mapLocation")
    res.status(200).json(shops)
})

// anyone: one shop
const getShop = asyncHandler(async (req, res) => {
    const shop = await Shop.findById(req.params.id).populate("festival", "name place mapLocation")

    if (!shop) {
        res.status(404)
        throw new Error("Shop not found")
    }

    res.status(200).json(shop)
})

export { createShop, getMyShop, updateMyShop, deleteMyShop, getShops, getShop }