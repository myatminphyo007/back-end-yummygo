import Reservation from "../models/Reservation.js"
import Coupon from "../models/Coupon.js"

// no 0, O, 1, I so the code is easy to read out loud
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

const randomPart = () => {
    let text = ""
    for (let i = 0; i < 6; i++) {
        text += CHARS[Math.floor(Math.random() * CHARS.length)]
    }
    return text
}

// reservation code: YG-XXXXXX
const generateCode = async () => {
    let code = `YG-${randomPart()}`
    while (await Reservation.findOne({ code })) {
        code = `YG-${randomPart()}`
    }
    return code
}

// coupon code: just 6 characters, like AHSKG7
export const generateCouponCode = async () => {
    let code = randomPart()
    while (await Coupon.findOne({ code })) {
        code = randomPart()
    }
    return code
}

export default generateCode