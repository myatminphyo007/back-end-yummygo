import asyncHandler from "express-async-handler"
import MenuItem from "../models/MenuItem.js"
import Shop from "../models/Shop.js"

// owner: add a menu item to my shop
const createMenuItem = asyncHandler(async (req, res) => {
    const { name, description, price } = req.body

    if (!name || price === undefined) {
        res.status(400)
        throw new Error("Please add name and price")
    }

    const shop = await Shop.findOne({ owner: req.user._id })
    if (!shop) {
        res.status(404)
        throw new Error("Create your shop first")
    }

    const image = req.file ? req.file.path : ""

    const item = await MenuItem.create({
        shop: shop._id,
        name,
        description,
        price,
        image,
    })

    res.status(201).json(item)
})

// anyone: see a shop's menu
const getShopMenu = asyncHandler(async (req, res) => {
    const items = await MenuItem.find({ shop: req.params.shopId })
    res.status(200).json(items)
})

// owner: edit one of my menu items
const updateMenuItem = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    const item = await MenuItem.findById(req.params.id)

    if (!item) {
        res.status(404)
        throw new Error("Menu item not found")
    }

    if (!shop || item.shop.toString() !== shop._id.toString()) {
        res.status(403)
        throw new Error("This is not your menu item")
    }

    const { name, description, price, available } = req.body

    if (name) item.name = name
    if (description !== undefined) item.description = description
    if (price !== undefined) item.price = price
    if (available !== undefined) item.available = available
    if (req.file) item.image = req.file.path

    const updated = await item.save()
    res.status(200).json(updated)
})

// owner: delete one of my menu items
const deleteMenuItem = asyncHandler(async (req, res) => {
    const shop = await Shop.findOne({ owner: req.user._id })
    const item = await MenuItem.findById(req.params.id)

    if (!item) {
        res.status(404)
        throw new Error("Menu item not found")
    }

    if (!shop || item.shop.toString() !== shop._id.toString()) {
        res.status(403)
        throw new Error("This is not your menu item")
    }

    await item.deleteOne()
    res.status(200).json({ message: "Menu item deleted" })
})

export { createMenuItem, getShopMenu, updateMenuItem, deleteMenuItem }