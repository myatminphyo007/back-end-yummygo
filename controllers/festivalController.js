import asyncHandler from "express-async-handler"
import Festival from "../models/Festival.js"

// only these fields can be changed by the admin
const FIELDS = ["name", "place", "startDate", "endDate", "description", "image", "mapLocation"]

const pickFields = (body) => {
    const data = {}
    for (const key of FIELDS) {
        if (body[key] !== undefined) data[key] = body[key]
    }
    return data
}

// admin: create a festival
const createFestival = asyncHandler(async (req, res) => {
    const { name, place, startDate, endDate } = req.body

    if (!name || !place || !startDate || !endDate) {
        res.status(400)
        throw new Error("Please add name, place, startDate and endDate")
    }

    const festival = await Festival.create(pickFields(req.body))
    res.status(201).json(festival)
})

// anyone: list all festivals
const getFestivals = asyncHandler(async (req, res) => {
    const festivals = await Festival.find().sort({ startDate: 1 })
    res.status(200).json(festivals)
})

// anyone: get one festival
const getFestival = asyncHandler(async (req, res) => {
    const festival = await Festival.findById(req.params.id)

    if (!festival) {
        res.status(404)
        throw new Error("Festival not found")
    }

    res.status(200).json(festival)
})

// admin: edit a festival
const updateFestival = asyncHandler(async (req, res) => {
    const festival = await Festival.findByIdAndUpdate(req.params.id, pickFields(req.body), {
        new: true,
        runValidators: true,
    })

    if (!festival) {
        res.status(404)
        throw new Error("Festival not found")
    }

    res.status(200).json(festival)
})

// admin: delete a festival
const deleteFestival = asyncHandler(async (req, res) => {
    const festival = await Festival.findByIdAndDelete(req.params.id)

    if (!festival) {
        res.status(404)
        throw new Error("Festival not found")
    }

    res.status(200).json({ message: "Festival deleted" })
})

export { createFestival, getFestivals, getFestival, updateFestival, deleteFestival }