import mongoose from "mongoose";

const cartProductSchema = mongoose.Schema({
  productId: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },

  // ── Variant selections (optional — only set if product has these options) ──
  size: {
    type: String,
    default: null,
  },
  productRam: {
    type: String,
    default: null,
  },
  productWeight: {
    type: String,
    default: null,
  },
  productColor: {
    type: mongoose.Schema.ObjectId,
    ref: "productColor",
    default: null,
  },

}, {
  timestamps: true,
})

// One cart entry per user+product+variant combo.
// Without this, adding the same product in different sizes creates duplicates.
cartProductSchema.index(
  { userId: 1, productId: 1, size: 1, productRam: 1, productWeight: 1, productColor: 1 },
  { unique: true }
)

const CartProductModel = mongoose.model("cartProduct", cartProductSchema)
export default CartProductModel