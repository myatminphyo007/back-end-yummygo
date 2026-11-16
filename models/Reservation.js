import mongoose from "mongoose"

const orderItemSchema = new mongoose.Schema({
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
})

const reservationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
        // empty when the visitor asked for a free time
        slot: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", default: null },
        date: { type: String, default: "" },
        time: { type: String, default: "" },
        people: { type: Number, required: true, min: 1 },
        status: {
            type: String,
            enum: ["pending", "approved", "offered", "completed", "noshow", "declined", "cancelled"],
            default: "pending",
        },
        note: { type: String, default: "" },
        code: { type: String, unique: true, sparse: true },
        items: { type: [orderItemSchema], default: [] },
        total: { type: Number, default: 0 },
        // the time the owner suggested, and how long the visitor has to answer
        offerDate: { type: String, default: "" },
        offerTime: { type: String, default: "" },
        offerSlot: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", default: null },
        offerExpiresAt: { type: Date, default: null },
        hiddenByUser: { type: Boolean, default: false },
        hiddenByOwner: { type: Boolean, default: false },
    },
    { timestamps: true }
)

const Reservation = mongoose.model("Reservation", reservationSchema)

export default Reservation