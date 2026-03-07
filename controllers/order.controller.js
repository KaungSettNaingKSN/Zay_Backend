import OrderModel       from '../models/order.model.js'
import CartProductModel from '../models/cartProduct.model.js'
import UserModel        from '../models/user.model.js'
import ProductModel     from '../models/product.model.js'
import { v4 as uuidv4 } from 'uuid'

// ─── Create Order ─────────────────────────────────────────────────────────────
export const createOrderController = async (req, res) => {
  try {
    const userId = req.userId
    const {
      paymentId,
      payment_status,
      delivery_address,
      sub_total_amount,
      total_amount,
      items,
    } = req.body

    if (!paymentId || !delivery_address || !items?.length) {
      return res.status(400).json({
        message: 'Provide paymentId, delivery_address and items',
        error: true, success: false,
      })
    }

    const orderItems = items.map(item => {
      const prod = item.productId
      return {
        productId: prod?._id || prod,
        product_details: {
          name:          prod?.name                  || '',
          image:         prod?.images                || [],
          size:          item.size                   || null,
          productRam:    item.productRam             || null,
          productWeight: item.productWeight          || null,
          productColor:  item.productColor?.name     || null,
        },
        quantity:  item.quantity || 1,
        price:     prod?.price   || 0,
        sub_total: (prod?.price  || 0) * (item.quantity || 1),
      }
    })

    const order = await OrderModel.create({
      userId,
      orderId:          uuidv4(),
      items:            orderItems,
      paymentId,
      payment_status:   payment_status || 'paid',
      delivery_address,
      sub_total_amount: sub_total_amount || orderItems.reduce((s, i) => s + i.sub_total, 0),
      total_amount:     total_amount    || sub_total_amount,
    })

    const stockUpdates = orderItems.map(item => ({
      updateOne: {
        filter: { _id: item.productId, countInStock: { $gte: item.quantity } },
        update: { $inc: { countInStock: -item.quantity, sale: +item.quantity } },
      }
    }))
    if (stockUpdates.length > 0) await ProductModel.bulkWrite(stockUpdates)

    await CartProductModel.deleteMany({ userId })
    await UserModel.updateOne({ _id: userId }, { $set: { shopping_cart: [] } })

    return res.status(201).json({
      message: 'Order placed successfully',
      error: false, success: true,
      data: order,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── Get Orders for logged-in user ───────────────────────────────────────────
export const getUserOrdersController = async (req, res) => {
  try {
    const userId = req.userId

    const orders = await OrderModel
      .find({ userId })
      .populate('delivery_address', 'address_line city state country pincode mobile address_name')
      .populate('items.productId',  'name images price brand')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      message: 'Orders fetched',
      error: false, success: true,
      data: orders,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── Get Single Order ────────────────────────────────────────────────────────
export const getOrderByIdController = async (req, res) => {
  try {
    const userId = req.userId
    const { id } = req.params

    const order = await OrderModel
      .findOne({ _id: id, userId })
      .populate('delivery_address', 'address_line city state country pincode mobile address_name')
      .populate('items.productId',  'name images price brand')

    if (!order) return res.status(404).json({ message: 'Order not found', error: true, success: false })

    return res.status(200).json({ message: 'Order fetched', error: false, success: true, data: order })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── All Orders (admin) ───────────────────────────────────────────────────────
export const getAllOrdersAdminController = async (req, res) => {
  try {
    const {
      page        = 1,
      limit       = 20,
      payment_status,
      search,
      date_from,
      date_to,
      sort_by     = 'createdAt',
      sort_order  = 'desc',
    } = req.query

    const filter = {}

    // ── Status filter ──────────────────────────────────────────────────────
    if (payment_status && payment_status !== 'all') {
      filter.payment_status = payment_status
    }

    // ── Date range filter ──────────────────────────────────────────────────
    if (date_from || date_to) {
      filter.createdAt = {}
      if (date_from) {
        filter.createdAt.$gte = new Date(date_from)
      }
      if (date_to) {
        const end = new Date(date_to)
        end.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = end
      }
    }

    // ── Search: orderId OR customer name/email ─────────────────────────────
    // FIX: use the already-imported UserModel at the top instead of dynamic import
    if (search && search.trim()) {
      const searchRegex   = { $regex: search.trim(), $options: 'i' }
      const matchingUsers = await UserModel.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select('_id').lean()

      const userIds = matchingUsers.map(u => u._id)

      filter.$or = [
        { orderId: searchRegex },
        ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
      ]
    }

    // ── Sort ───────────────────────────────────────────────────────────────
    const ALLOWED_SORT = ['createdAt', 'total_amount']
    const sortField    = ALLOWED_SORT.includes(sort_by) ? sort_by : 'createdAt'
    const sortDir      = sort_order === 'asc' ? 1 : -1
    const sortObj      = { [sortField]: sortDir }

    const pageNum  = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))

    const [total, orders] = await Promise.all([
      OrderModel.countDocuments(filter),
      OrderModel
        .find(filter)
        .populate('userId',           'name email avatar')
        .populate('delivery_address', 'address_line city state country pincode mobile address_name')
        .populate('items.productId',  'name images price')
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
    ])

    return res.status(200).json({
      message:    'All orders fetched',
      error:      false,
      success:    true,
      data:       orders,
      total,
      page:       pageNum,
      totalPages: Math.ceil(total / limitNum),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}

// ─── Update Order Status (admin) ─────────────────────────────────────────────
export const updateOrderStatusController = async (req, res) => {
  try {
    const { id }             = req.params
    const { payment_status } = req.body

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(', ')}`,
        error: true, success: false,
      })
    }

    const updated = await OrderModel.findByIdAndUpdate(
      id,
      { payment_status },
      { new: true },
    ).populate('userId', 'name email')

    if (!updated) return res.status(404).json({ message: 'Order not found', error: true, success: false })

    return res.status(200).json({
      message: 'Order status updated',
      error:   false,
      success: true,
      data:    updated,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || error, error: true, success: false })
  }
}