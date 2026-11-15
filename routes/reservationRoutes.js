import express from "express"
import protect from "../middleware/authMiddleware.js"
import { ownerOnly, customerOnly } from "../middleware/roleMiddleware.js"
import {
    createReservation,
    getMyReservations,
    cancelReservation,
    deleteMyReservation,
    clearMyHistory,
    getShopReservations,
    deleteShopReservation,
    clearShopHistory,
    updateReservationStatus,
    getReservationByCode,
    checkInReservation,
    getMyStamps,
    getCouponByCode,
    redeemCoupon,
} from "../controllers/reservationController.js"

const router = express.Router()

// customer
router.post("/", protect, customerOnly, createReservation)
router.get("/my", protect, customerOnly, getMyReservations)
router.get("/stamps", protect, customerOnly, getMyStamps)
router.delete("/history", protect, customerOnly, clearMyHistory)
router.put("/:id/cancel", protect, customerOnly, cancelReservation)
router.delete("/:id", protect, customerOnly, deleteMyReservation)

// owner
router.get("/shop", protect, ownerOnly, getShopReservations)
router.delete("/shop/history", protect, ownerOnly, clearShopHistory)
router.delete("/shop/:id", protect, ownerOnly, deleteShopReservation)
router.get("/code/:code", protect, ownerOnly, getReservationByCode)
router.get("/coupon/:code", protect, ownerOnly, getCouponByCode)
router.put("/coupon/:id/use", protect, ownerOnly, redeemCoupon)
router.put("/:id/status", protect, ownerOnly, updateReservationStatus)
router.put("/:id/checkin", protect, ownerOnly, checkInReservation)

export default router