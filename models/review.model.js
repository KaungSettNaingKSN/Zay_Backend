import mongoose from "mongoose";

const reviewSchema = mongoose.Schema({
  // FIX: was completely empty — model name was also wrong ("cartProduct")
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "UserId is required"],
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "ProductId is required"],
  },
  rating: {
    type: Number,
    required: [true, "Rating is required"],
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    required: [true, "Review text is required"],
    trim: true,
  },
  // Denormalised for fast display — no populate needed
  userName:   { type: String, default: "" },
  userAvatar: { type: String, default: "" },
}, {
  timestamps: true,
});

// One review per user per product
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

const ReviewModel = mongoose.model("Review", reviewSchema);
export default ReviewModel;