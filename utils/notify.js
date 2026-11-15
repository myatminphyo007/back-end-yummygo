import Notification from "../models/Notification.js"

// creates one notification. It never stops the main action if it fails.
const notify = async (userId, type, data = {}, link = "") => {
    try {
        await Notification.create({ user: userId, type, data, link })
    } catch (err) {
        console.error("Notification error:", err.message)
    }
}

export default notify