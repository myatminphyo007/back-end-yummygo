import Review from "../models/Review.js"
import Shop from "../models/Shop.js"

const updateShopRating = async (shopId) => {
    const reviews = await Review.find({ shop: shopId })

    const count = reviews.length
    const total = reviews.reduce((sum, r) => sum + r.rating, 0)
    const avg = count ? Math.round((total / count) * 10) / 10 : 0

    await Shop.findByIdAndUpdate(shopId, { avgRating: avg, reviewCount: count })
}

export default updateShopRating