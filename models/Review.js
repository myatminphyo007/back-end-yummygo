import mongoose from "mongoose"

const reviewSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: "", maxlength: 500 },
    },
    { timestamps: true }
)

// one review per customer per shop
reviewSchema.index({ user: 1, shop: 1 }, { unique: true })

const Review = mongoose.model("Review", reviewSchema)

export default Review