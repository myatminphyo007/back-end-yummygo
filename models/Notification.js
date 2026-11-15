import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        // a message key like "booking.approved", translated in the browser
        type: { type: String, required: true },
        // values for the message, for example { shop: "la ou shop", code: "ABC123" }
        data: { type: Object, default: {} },
        link: { type: String, default: "" },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
)

notificationSchema.index({ user: 1, read: 1, createdAt: -1 })

const Notification = mongoose.model("Notification", notificationSchema)

export default Notification