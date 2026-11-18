// Sends one email through the Brevo HTTPS API.
// (Render free servers block normal SMTP ports, so we use HTTPS instead.)
export async function sendMail({ to, subject, html, text }) {
    const apiKey = process.env.BREVO_API_KEY
    const from = process.env.MAIL_FROM

    if (!apiKey || !from) {
        console.error("BREVO_API_KEY or MAIL_FROM is missing")
        throw new Error("Email is not set up on the server")
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": apiKey,
            "content-type": "application/json",
            accept: "application/json"
        },
        body: JSON.stringify({
            sender: { name: "Yummy Go", email: from },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: text
        })
    })

    if (!res.ok) {
        const body = await res.text().catch(() => "")
        console.error("Brevo error", res.status, body)
        throw new Error("Could not send the email. Please try again later.")
    }
}
