import myListModel from "../models/myList.model.js"

// ─── Add to My List ──────────────────────────────────────────────────────────
export const addToMyListController = async (req, res) => {
  try {
    const userId = req.userId
    const { productId } = req.body

    // FIX: status 400, not 500 — this is a client error
    if (!productId) {
      return res.status(400).json({
        message: 'Provide product id',
        error: true,
        success: false,
      })
    }

    const existing = await myListModel.findOne({ userId, productId })

    if (existing) {
      return res.status(400).json({
        message: 'Item already in your list',
        error: true,
        success: false,
      })
    }

    // FIX: only store refs — no redundant product fields needed
    // Product data is fetched via populate() in getMyListController
    const saved = await myListModel.create({ userId, productId })

    return res.status(201).json({
      message: 'Added to list',
      error: false,
      success: true,
      data: saved,
    })
  } catch (error) {
    // FIX: handle duplicate key error from the unique index gracefully
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Item already in your list',
        error: true,
        success: false,
      })
    }
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

// ─── Delete from My List ─────────────────────────────────────────────────────
export const deleteMyListController = async (req, res) => {
  try {
    const userId = req.userId

    // FIX: verify the item belongs to this user before deleting
    // Old code could let any authenticated user delete anyone's list item
    const deleted = await myListModel.findOneAndDelete({
      _id: req.params.id,
      userId: userId,       // ownership check
    })

    if (!deleted) {
      return res.status(404).json({
        message: 'Item not found',
        error: true,
        success: false,
      })
    }

    return res.status(200).json({
      message: 'Removed from list',
      error: false,
      success: true,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

// ─── Get My List ─────────────────────────────────────────────────────────────
export const getMyListController = async (req, res) => {
  try {
    const userId = req.userId

    // FIX: populate productId so frontend gets full product details
    const myList = await myListModel
      .find({ userId })
      .populate('productId')

    return res.status(200).json({
      message: 'Success',
      error: false,
      success: true,
      data: myList,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

// ─── Check if product is in list ─────────────────────────────────────────────
export const checkMyListController = async (req, res) => {
  try {
    const userId    = req.userId
    const { productId } = req.params

    const item = await myListModel.findOne({ userId, productId })

    return res.status(200).json({
      message: 'Success',
      error: false,
      success: true,
      isInList: !!item,
      itemId: item?._id || null,   // return _id so frontend can delete by id
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}