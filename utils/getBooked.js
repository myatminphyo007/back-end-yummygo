import Reservation from "../models/Reservation.js"

const getBooked = async (slotId, excludeId) => {
    const filter = { slot: slotId, status: { $in: ["approved", "completed"] } }
    if (excludeId) filter._id = { $ne: excludeId }

    const list = await Reservation.find(filter)
    return list.reduce((sum, r) => sum + r.people, 0)
}

export default getBooked