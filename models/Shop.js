import mongoose from "mongoose"

const shopSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        festival: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Festival",
            required: true,
        },
        name: { type: String, required: true },
        category: { type: String, default: "" },
        description: { type: String, default: "" },
        image: { type: String, default: "" },
        gallery: { type: [String], default: [] },
        locationNote: { type: String, default: "", maxlength: 200 },
        avgRating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        stampRally: { type: Boolean, default: false },
        stampsNeeded: { type: Number, default: 3, min: 1, max: 20 },
        rewardName: { type: String, default: "" },
    },
    { timestamps: true }
)

const Shop = mongoose.model("Shop", shopSchema)

export default Shop