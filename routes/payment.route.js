import express from 'express'
import {
  createPaymentIntentController,
  stripeWebhookController,
} from '../controllers/payment.controller.js'
import auth from '../middleware/auth.js';

const paymentRouter = express.Router()

// Webhook must use raw body — mount BEFORE express.json() in app.js
// app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), stripeWebhookController)
paymentRouter.post('/webhook',        stripeWebhookController)

// Protected routes
paymentRouter.post('/create-intent',  auth, createPaymentIntentController)

export default paymentRouter