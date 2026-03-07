import mongoose from "mongoose"

// Each item inside an order
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.ObjectId,
    ref:  "Product",
  },
  product_details: {
    name:          String,
    image:         Array,
    size:          { type: String, default: null },
    productRam:    { type: String, default: null },
    productWeight: { type: String, default: null },
    productColor:  { type: String, default: null },
  },
  quantity:      { type: Number, default: 1 },
  price:         { type: Number, default: 0 },
  sub_total:     { type: Number, default: 0 },
}, { _id: false })

const orderSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref:  "User",
    required: true,
  },
  orderId: {
    type:     String,
    required: [true, "Provide OrderId"],
    unique:   true,
  },
  // ── All items in this single order ──────────────────────────────────────
  items: [orderItemSchema],

  paymentId: {
    type:    String,
    default: "",
  },
  payment_status: {
    type:    String,
    default: "pending",
    enum:    ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"],
  },
  delivery_address: {
    type: mongoose.Schema.ObjectId,
    ref:  "address",
  },
  sub_total_amount: { type: Number, default: 0 },
  total_amount:     { type: Number, default: 0 },
  invoice_receipt:  { type: String, default: "" },
}, {
  timestamps: true,
})

const OrderModel = mongoose.model("Order", orderSchema)
export default OrderModel