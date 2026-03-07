import CartProductModel from '../models/cartProduct.model.js'
import UserModel from '../models/user.model.js'

// ─── Add To Cart ────────────────────────────────────────────────────────────
export const addToCartItemController = async (req, res) => {
  try {
    const userId = req.userId
    const {
      productId,
      quantity,
      size          = null,
      productRam    = null,
      productWeight = null,
      productColor  = null,
    } = req.body

    if (!productId) {
      return res.status(400).json({
        message: 'Provide product id',
        error: true,
        success: false,
      })
    }

    // Check for existing item with the SAME variant combo
    // (same product in size "M" vs "L" = two separate cart entries)
    const checkItemCart = await CartProductModel.findOne({
      userId,
      productId,
      size:          size          ?? null,
      productRam:    productRam    ?? null,
      productWeight: productWeight ?? null,
      productColor:  productColor  ?? null,
    })

    if (checkItemCart) {
      return res.status(400).json({
        message: 'Item already in cart',
        error: true,
        success: false,
      })
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1)

    const cartItem = new CartProductModel({
      quantity:      qty,
      userId,
      productId,
      size:          size          || null,
      productRam:    productRam    || null,
      productWeight: productWeight || null,
      productColor:  productColor  || null,
    })

    const saved = await cartItem.save()

    await UserModel.updateOne(
      { _id: userId },
      { $push: { shopping_cart: saved._id } }
    )

    return res.status(201).json({
      message: 'Item added to cart successfully',
      error: false,
      success: true,
      data: saved,
    })
  } catch (error) {
    // Unique index fallback for race conditions
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Item already in cart',
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

// ─── Get Cart Items ──────────────────────────────────────────────────────────
export const getCartItemController = async (req, res) => {
  try {
    const userId = req.userId

    const cartItems = await CartProductModel
      .find({ userId })
      .populate('productId')
      .populate('productColor')  // populate so frontend gets color name + hex

    const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalPrice = cartItems.reduce((sum, item) => {
      const price = item.productId?.price ?? 0
      return sum + price * item.quantity
    }, 0)

    return res.status(200).json({
      message: 'Success',
      error: false,
      success: true,
      data: cartItems,
      totalQty,
      totalPrice,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

// ─── Update Cart Item Quantity ───────────────────────────────────────────────
export const updateCartItemController = async (req, res) => {
  try {
    const userId = req.userId
    const { _id, quantity } = req.body

    if (!_id || quantity === undefined) {
      return res.status(400).json({
        message: 'Provide cart item id and quantity',
        error: true,
        success: false,
      })
    }

    if (quantity < 1) {
      return res.status(400).json({
        message: 'Quantity must be at least 1',
        error: true,
        success: false,
      })
    }

    const updatedItem = await CartProductModel.findOneAndUpdate(
      { _id, userId },
      { quantity },
      { new: true }
    )

    if (!updatedItem) {
      return res.status(404).json({
        message: 'Cart item not found',
        error: true,
        success: false,
      })
    }

    return res.status(200).json({
      message: 'Cart updated successfully',
      error: false,
      success: true,
      data: updatedItem,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

// ─── Delete Cart Item ────────────────────────────────────────────────────────
export const deleteCartItemController = async (req, res) => {
  try {
    const userId = req.userId
    const { _id } = req.body

    if (!_id) {
      return res.status(400).json({
        message: 'Provide cart item id',
        error: true,
        success: false,
      })
    }

    const cartItem = await CartProductModel.findOne({ _id, userId })

    if (!cartItem) {
      return res.status(404).json({
        message: 'Cart item not found',
        error: true,
        success: false,
      })
    }

    await CartProductModel.deleteOne({ _id, userId })

    await UserModel.updateOne(
      { _id: userId },
      { $pull: { shopping_cart: cartItem._id } }
    )

    return res.status(200).json({
      message: 'Item removed from cart',
      error: false,
      success: true,
      data: cartItem,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

// ─── Update Cart Item Variants ───────────────────────────────────────────────
// Separate from quantity update — lets user change size/color/ram/weight
// of an item already in cart from the product details page
export const updateCartVariantsController = async (req, res) => {
  try {
    const userId = req.userId
    const {
      _id,
      size          = null,
      productRam    = null,
      productWeight = null,
      productColor  = null,
    } = req.body

    if (!_id) {
      return res.status(400).json({
        message: 'Provide cart item id',
        error: true,
        success: false,
      })
    }

    // Check the new variant combo doesn't clash with another existing cart item
    const clash = await CartProductModel.findOne({
      userId,
      size:          size          ?? null,
      productRam:    productRam    ?? null,
      productWeight: productWeight ?? null,
      productColor:  productColor  ?? null,
      _id:           { $ne: _id }, // exclude self
    })

    if (clash) {
      return res.status(400).json({
        message: 'You already have this variant in your cart',
        error: true,
        success: false,
      })
    }

    const updatedItem = await CartProductModel.findOneAndUpdate(
      { _id, userId },
      {
        size:          size          || null,
        productRam:    productRam    || null,
        productWeight: productWeight || null,
        productColor:  productColor  || null,
      },
      { new: true }
    )

    if (!updatedItem) {
      return res.status(404).json({
        message: 'Cart item not found',
        error: true,
        success: false,
      })
    }

    return res.status(200).json({
      message: 'Cart variants updated',
      error: false,
      success: true,
      data: updatedItem,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'You already have this variant in your cart',
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