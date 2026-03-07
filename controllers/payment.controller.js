import Stripe     from 'stripe'
import OrderModel from '../models/order.model.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// ─── Create Payment Intent ────────────────────────────────────────────────────
// Called by frontend before showing the card form.
// Returns a clientSecret which Stripe uses to confirm the payment on the frontend.
export const createPaymentIntentController = async (req, res) => {
  try {
    const userId = req.userId
    const { amount, currency = 'usd', orderId } = req.body

    console.log('💳 create-intent called | amount:', amount, '| userId:', userId)

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: 'Invalid amount — make sure cart items have prices',
        error:   true,
        success: false,
      })
    }

    // Stripe amount is in cents — multiply dollars by 100
    console.log('💳 Creating Stripe intent for amount (cents):', Math.round(amount * 100))
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),
      currency,
      metadata: {
        userId:  String(userId),
        orderId: String(orderId || ''),
      },
    })

    console.log('💳 Returning clientSecret:', paymentIntent.client_secret ? paymentIntent.client_secret.slice(0,30) + '...' : 'NULL')
    return res.status(200).json({
      message:      'Payment intent created',
      error:        false,
      success:      true,
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Payment failed',
      error:   true,
      success: false,
    })
  }
}

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
// Stripe calls this URL after payment succeeds/fails.
// In your main app, mount this BEFORE express.json() with raw body:
//   app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), stripeWebhookController)
export const stripeWebhookController = async (req, res) => {
  const sig            = req.headers['stripe-signature']
  const webhookSecret  = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const { userId, orderId } = paymentIntent.metadata
    console.log(`✅ Payment succeeded — userId: ${userId}`)
    // Mark all orders with this paymentId as paid (backup safety net)
    await OrderModel.updateMany(
      { paymentId: paymentIntent.id },
      { payment_status: 'paid' }
    )
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object
    console.log(`❌ Payment failed — ${paymentIntent.last_payment_error?.message}`)
  }

  res.json({ received: true })
}