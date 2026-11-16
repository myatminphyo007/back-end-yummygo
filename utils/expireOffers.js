import Reservation from "../models/Reservation.js"
import Shop from "../models/Shop.js"
import notify from "./notify.js"

// suggested times that nobody answered in time are cancelled
const expireOffers = async (filter = {}) => {
    const late = await Reservation.find({
        ...filter,
        status: "offered",
        offerExpiresAt: { $lte: new Date() },
    })

    for (const r of late) {
        // only one request wins, so nobody gets two messages
        const done = await Reservation.findOneAndUpdate(
            { _id: r._id, status: "offered" },
            { status: "cancelled" }
        )
        if (!done) continue

        const shop = await Shop.findById(r.shop)

        await notify(
            r.user,
            "booking.offerExpired",
            { shop: shop?.name || "", date: r.offerDate, time: r.offerTime },
            "/my-reservations"
        )
        if (shop) {
            await notify(
                shop.owner,
                "booking.offerExpiredOwner",
                { code: r.code, date: r.offerDate, time: r.offerTime },
                "/owner"
            )
        }
    }
}

export default expireOffers