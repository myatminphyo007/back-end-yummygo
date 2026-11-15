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
        slot: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", required: true },
        people: { type: Number, required: true, min: 1 },
        status: {
            type: String,
            enum: ["pending", "approved", "completed", "noshow", "declined", "cancelled"],
            default: "pending",
        },
        note: { type: String, default: "" },
        code: { type: String, unique: true, sparse: true },
        items: { type: [orderItemSchema], default: [] },
        total: { type: Number, default: 0 },
        hiddenByUser: { type: Boolean, default: false },
        hiddenByOwner: { type: Boolean, default: false },
    },
    { timestamps: true }
)

const Reservation = mongoose.model("Reservation", reservationSchema)

export default Reservation