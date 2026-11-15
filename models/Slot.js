import mongoose from "mongoose"

const slotSchema = new mongoose.Schema(
    {
        shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
        date: { type: String, required: true },   // "2026-08-10"
        time: { type: String, required: true },   // "11:00"
        capacity: { type: Number, required: true, min: 1 },
    },
    { timestamps: true }
)

// the same shop cannot have two slots at the same date and time
slotSchema.index({ shop: 1, date: 1, time: 1 }, { unique: true })

const Slot = mongoose.model("Slot", slotSchema)

export default Slot