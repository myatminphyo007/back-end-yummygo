import mongoose from "mongoose"

// one row per (email, purpose). The code is stored hashed, never as plain text.
const emailCodeSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, required: true, enum: ["register", "reset", "change"] },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
})

emailCodeSchema.index({ email: 1, purpose: 1 }, { unique: true })
// MongoDB deletes the row by itself after expiresAt
emailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const EmailCode = mongoose.model("EmailCode", emailCodeSchema)
export default EmailCode
