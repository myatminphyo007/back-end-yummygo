import Reservation from "../models/Reservation.js"
import Coupon from "../models/Coupon.js"
import { generateCouponCode } from "./generateCode.js"

// Count the completed visits of one visitor at one stall.
// Every full card (stampsNeeded visits) gets one coupon.
// Returns the new coupons and how many stamps are on the current card.
const issueCoupons = async (userId, shop) => {
    const needed = shop.stampsNeeded || 3

    const visits = await Reservation.countDocuments({
        user: userId,
        shop: shop._id,
        status: "completed",
    })

    let made = await Coupon.countDocuments({ user: userId, shop: shop._id })
    const newCoupons = []

    while (visits - made * needed >= needed) {
        try {
            const coupon = await Coupon.create({
                user: userId,
                shop: shop._id,
                cycle: made + 1,
                code: await generateCouponCode(),
                rewardName: shop.rewardName || "Free item",
            })
            newCoupons.push(coupon)
        } catch (err) {
            // 11000 = another request already made this coupon, so skip it
            if (err.code !== 11000) throw err
        }
        made += 1
    }

    const progress = Math.max(0, visits - made * needed)
    return { newCoupons, progress, needed }
}

export default issueCoupons