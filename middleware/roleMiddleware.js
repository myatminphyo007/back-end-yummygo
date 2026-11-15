const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        return next()
    }
    res.status(403)
    throw new Error("Admin only")
}

const ownerOnly = (req, res, next) => {
    if (req.user && req.user.role === "owner") {
        return next()
    }
    res.status(403)
    throw new Error("Owner only")
}

const customerOnly = (req, res, next) => {
    if (req.user && req.user.role === "customer") {
        return next()
    }
    res.status(403)
    throw new Error("Customer only")
}

export { adminOnly, ownerOnly, customerOnly }