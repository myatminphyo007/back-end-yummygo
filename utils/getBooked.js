import Reservation from "../models/Reservation.js"

// places taken in one slot: confirmed and finished bookings,
// plus suggested times that are still on hold
const getBooked = async (slotId) => {
    const list = await Reservation.find({
        $or: [
            { slot: slotId, status: { $in: ["approved", "completed"] } },
            { offerSlot: slotId, status: "offered", offerExpiresAt: { $gt: new Date() } },
        ],
    })

    return list.reduce((sum, r) => sum + r.people, 0)
}

export default getBooked