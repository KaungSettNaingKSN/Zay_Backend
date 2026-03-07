import express from 'express'
import {
  createOrderController,
  getUserOrdersController,
  getOrderByIdController,
  getAllOrdersAdminController,
  updateOrderStatusController,
} from '../controllers/order.controller.js'
import auth from '../middleware/auth.js';
import adminAuth  from '../middleware/adminAuth.js' 

const orderRouter = express.Router()

// ── User routes ───────────────────────────────────────────────────────────────
orderRouter.post('/',        auth,              createOrderController)        // place order
orderRouter.get ('/',        auth,              getUserOrdersController)       // my orders
orderRouter.get ('/:id',     auth,              getOrderByIdController)        // single order

// ── Admin routes ──────────────────────────────────────────────────────────────
orderRouter.get ('/admin/all',  auth, adminAuth, getAllOrdersAdminController)   // all orders
orderRouter.put ('/admin/:id/status', auth, adminAuth, updateOrderStatusController) // update status

export default orderRouter