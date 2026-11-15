import mongoose from "mongoose"

const couponSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
        cycle: { type: Number, required: true },
        code: { type: String, required: true, unique: true },
        rewardName: { type: String, default: "" },
        status: { type: String, enum: ["active", "used"], default: "active" },
        usedAt: { type: Date },
    },
    { timestamps: true }
)

// one coupon per card cycle, per visitor and stall
couponSchema.index({ user: 1, shop: 1, cycle: 1 }, { unique: true })

const Coupon = mongoose.model("Coupon", couponSchema)

export default Coupon