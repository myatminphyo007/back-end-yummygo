import crypto from "crypto"
import EmailCode from "../models/EmailCode.js"
import { sendMail } from "./sendMail.js"

const TTL_MINUTES = 10
const COOLDOWN_SECONDS = 60
const MAX_TRIES = 5

const hashCode = (email, purpose, code) =>
    crypto
        .createHash("sha256")
        .update(`${email}|${purpose}|${code}|${process.env.JWT_SECRET}`)
        .digest("hex")

// the email text in the 4 languages of the site
const COPY = {
    en: {
        subject: (c) => `Your Yummy Go code: ${c}`,
        hello: "Your verification code is",
        expire: "It expires in 10 minutes.",
        ignore: "If you did not ask for this, you can ignore this email."
    },
    ja: {
        subject: (c) => `Yummy Go 認証コード: ${c}`,
        hello: "認証コードは次のとおりです",
        expire: "このコードは10分間有効です。",
        ignore: "心当たりがない場合は、このメールを無視してください。"
    },
    ko: {
        subject: (c) => `Yummy Go 인증 코드: ${c}`,
        hello: "인증 코드는 다음과 같습니다",
        expire: "이 코드는 10분간 유효합니다.",
        ignore: "요청하지 않으셨다면 이 메일을 무시해 주세요."
    },
    my: {
        subject: (c) => `Yummy Go အတည်ပြုကုဒ်: ${c}`,
        hello: "သင့်အတည်ပြုကုဒ်မှာ",
        expire: "ဤကုဒ်သည် ၁၀ မိနစ်အထိ သုံးနိုင်ပါသည်။",
        ignore: "သင်မတောင်းဆိုခဲ့ပါက ဤအီးမေးလ်ကို လျစ်လျူရှုပါ။"
    }
}

function buildHtml(copy, code) {
    return `<div style="font-family:Arial,'Noto Sans JP',sans-serif;background:#fffbf7;padding:24px">
<div style="max-width:420px;margin:0 auto;background:#ffffff;border:1px solid #efdce1;border-radius:18px;padding:28px;text-align:center">
<h2 style="color:#922d4b;margin:0 0 8px">Yummy Go</h2>
<p style="color:#37252b;margin:0">${copy.hello}</p>
<div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#922d4b;background:#fff0f3;border-radius:12px;padding:14px 0;margin:16px 0">${code}</div>
<p style="color:#81747a;font-size:14px;margin:0">${copy.expire}<br>${copy.ignore}</p>
</div></div>`
}

// make a code, save it (hashed) and email it
export async function issueCode(rawEmail, purpose, lang, res) {
    const email = String(rawEmail || "").trim().toLowerCase()
    const copy = COPY[lang] || COPY.en

    const old = await EmailCode.findOne({ email, purpose })
    if (old) {
        const waited = (Date.now() - old.lastSentAt.getTime()) / 1000
        if (waited < COOLDOWN_SECONDS) {
            res.status(429)
            throw new Error(`Please wait ${Math.ceil(COOLDOWN_SECONDS - waited)} seconds before asking for a new code`)
        }
    }

    const code = String(crypto.randomInt(100000, 1000000))

    await EmailCode.findOneAndUpdate(
        { email, purpose },
        {
            codeHash: hashCode(email, purpose, code),
            attempts: 0,
            lastSentAt: new Date(),
            expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000)
        },
        { upsert: true, new: true }
    )

    try {
        await sendMail({
            to: email,
            subject: copy.subject(code),
            html: buildHtml(copy, code),
            text: `${copy.hello}: ${code}\n${copy.expire}\n${copy.ignore}`
        })
    } catch (err) {
        // do not keep a code the person never received
        await EmailCode.deleteOne({ email, purpose })
        throw err
    }
}

// check a code. A right code is used up (works only once).
export async function verifyCode(rawEmail, purpose, rawCode, res) {
    const email = String(rawEmail || "").trim().toLowerCase()
    const code = String(rawCode || "").trim()

    const row = await EmailCode.findOne({ email, purpose })
    if (!row || row.expiresAt.getTime() < Date.now()) {
        res.status(400)
        throw new Error("The code has expired. Please ask for a new one.")
    }

    if (row.attempts >= MAX_TRIES) {
        await EmailCode.deleteOne({ _id: row._id })
        res.status(400)
        throw new Error("Too many wrong tries. Please ask for a new code.")
    }

    const a = Buffer.from(hashCode(email, purpose, code))
    const b = Buffer.from(row.codeHash)
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b)

    if (!ok) {
        row.attempts += 1
        await row.save()
        res.status(400)
        throw new Error("Wrong code")
    }

    await EmailCode.deleteOne({ _id: row._id })
    return true
}
