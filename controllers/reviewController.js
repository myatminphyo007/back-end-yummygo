import asyncHandler from "express-async-handler"
import Review from "../models/Review.js"
import Shop from "../models/Shop.js"
import Reservation from "../models/Reservation.js"
import updateShopRating from "../utils/updateShopRating.js"

const MAX_PHOTOS = 3

// customer: add a review (photos are optional)
const createReview = asyncHandler(async (req, res) => {
    const { shopId, rating, comment } = req.body

    if (!shopId || !rating) {
        res.status(400)
        throw new Error("Please add shopId and rating")
    }

    const shop = await Shop.findById(shopId)
    if (!shop) {
        res.status(404)
        throw new Error("Shop not found")
    }

    // only customers with an approved reservation can review
    const visited = await Reservation.findOne({
        user: req.user._id,
        shop: shop._id,
        status: { $in: ["approved", "completed"] },
    })
    if (!visited) {
        res.status(403)
        throw new Error("You can review a shop only after an approved reservation")
    }

    const already = await Review.findOne({ user: req.user._id, shop: shop._id })
    if (already) {
        res.status(400)
        throw new Error("You already reviewed this shop")
    }

    const photos = (req.files || []).map((f) => f.path)

    const review = await Review.create({
        user: req.user._id,
        shop: shop._id,
        rating,
        comment,
        photos,
    })

    await updateShopRating(shop._id)
    res.status(201).json(review)
})

// anyone: reviews of a shop
const getShopReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.find({ shop: req.params.shopId })
        .populate("user", "name profileImage")
        .sort({ createdAt: -1 })

    res.status(200).json(reviews)
})

// customer: edit my review (text, rating and photos)
const updateReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id)

    if (!review) {
        res.status(404)
        throw new Error("Review not found")
    }

    if (review.user.toString() !== req.user._id.toString()) {
        res.status(403)
        throw new Error("This is not your review")
    }

    const { rating, comment } = req.body
    if (rating !== undefined) review.rating = rating
    if (comment !== undefined) review.comment = comment

    // photos: remove some (removePhotos = JSON list of links) and/or add new ones
    let remove = []
    if (req.body.removePhotos) {
        try {
            const parsed = JSON.parse(req.body.removePhotos)
            if (Array.isArray(parsed)) remove = parsed
        } catch {
            remove = []
        }
    }
    const kept = review.photos.filter((p) => !remove.includes(p))
    const added = (req.files || []).map((f) => f.path)

    if (kept.length + added.length > MAX_PHOTOS) {
        res.status(400)
        throw new Error(`You can add up to ${MAX_PHOTOS} photos`)
    }
    review.photos = [...kept, ...added]

    const updated = await review.save()
    await updateShopRating(review.shop)
    res.status(200).json(updated)
})

// author or admin: delete a review
const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id)

    if (!review) {
        res.status(404)
        throw new Error("Review not found")
    }

    const isAuthor = review.user.toString() === req.user._id.toString()
    const isAdmin = req.user.role === "admin"
    if (!isAuthor && !isAdmin) {
        res.status(403)
        throw new Error("You cannot delete this review")
    }

    const shopId = review.shop
    await review.deleteOne()
    await updateShopRating(shopId)
    res.status(200).json({ message: "Review deleted" })
})

export { createReview, getShopReviews, updateReview, deleteReview }