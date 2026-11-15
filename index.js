import "dotenv/config"
import dns from "dns"
import express from "express"
import cors from "cors"
import connectDB from "./config/db.js"
import authRoutes from "./routes/authRoutes.js"
import festivalRoutes from "./routes/festivalRoutes.js"
import shopRoutes from "./routes/shopRoutes.js"
import menuRoutes from "./routes/menuRoutes.js"
import slotRoutes from "./routes/slotRoutes.js"
import reservationRoutes from "./routes/reservationRoutes.js"
import reviewRoutes from "./routes/reviewRoutes.js"
import { notFound, errorHandler } from "./middleware/errorMiddleware.js"
import statsRoutes from "./routes/statsRoutes.js"
import notificationRoutes from "./routes/notificationRoutes.js"

dns.setServers(["8.8.8.8", "8.8.4.4"])

const app = express()

// 1. middleware first
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// 2. routes
app.use("/api/auth", authRoutes)
app.use("/api/festivals", festivalRoutes)
app.use("/api/shops", shopRoutes)
app.use("/api/menu", menuRoutes)
app.use("/api/slots", slotRoutes)
app.use("/api/reservations", reservationRoutes)
app.use("/api/reviews", reviewRoutes)
app.use("/api/stats", statsRoutes)
app.use("/api/notifications", notificationRoutes)

// 3. error handlers LAST
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 4000

connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
})