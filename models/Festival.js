import mongoose from "mongoose"

const festivalSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        place: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        description: { type: String, default: "" },
        image: { type: String, default: "" },
        mapLocation: { type: String, default: "", maxlength: 500 },
    },
    { timestamps: true }
)

const Festival = mongoose.model("Festival", festivalSchema)

export default Festival