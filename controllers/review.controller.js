import mongoose from "mongoose";
import ReviewModel  from "../models/review.model.js";
import ProductModel from "../models/product.model.js";

// ─── Helper: recalculate product rating + numReviews after any change ─────────
async function syncProductRating(productId) {
  const stats = await ReviewModel.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const avg   = stats[0]?.avgRating ?? 0;
  const count = stats[0]?.count     ?? 0;
  await ProductModel.findByIdAndUpdate(productId, {
    rating:     Math.round(avg * 10) / 10,
    numReviews: count,
  });
}

// ─── GET /api/review/:productId ───────────────────────────────────────────────
export async function getProductReviews(req, res) {
  try {
    const reviews = await ReviewModel.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({ success: true, error: false, data: reviews });
  } catch (e) {
    return res.status(500).json({ message: e.message, error: true, success: false });
  }
}

// ─── POST /api/review/add ─────────────────────────────────────────────────────
export async function addReview(req, res) {
  try {
    const { productId, rating, review } = req.body;
    const userId = req.userId  // FIX: was req.userId — auth middleware sets req.user

    if (!productId || !rating || !review?.trim()) {
      return res.status(400).json({ message: "productId, rating and review are required", error: true, success: false });
    }

    const existing = await ReviewModel.findOne({ userId, productId });
    if (existing) {
      return res.status(400).json({ message: "You have already reviewed this product", error: true, success: false });
    }

    const newReview = new ReviewModel({
      userId,
      productId,
      rating:     Number(rating),
      review:     review.trim(),
      userName:   req.user?.name   || "",  // FIX: was req.name — must be req.user.name
      userAvatar: req.user?.avatar || "",  // FIX: was req.avatar — must be req.user.avatar
    });

    await newReview.save();
    await syncProductRating(productId);

    return res.status(201).json({ success: true, error: false, message: "Review added", data: newReview });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ message: "You have already reviewed this product", error: true, success: false });
    }
    return res.status(500).json({ message: e.message, error: true, success: false });
  }
}

// ─── PUT /api/review/:reviewId ────────────────────────────────────────────────
export async function updateReview(req, res) {
  try {
    const { rating, review } = req.body;
    const existing = await ReviewModel.findById(req.params.reviewId);
    if (!existing) {
      return res.status(404).json({ message: "Review not found", error: true, success: false });
    }
    if (existing.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not authorised", error: true, success: false });
    }
    if (rating) existing.rating = Number(rating);
    if (review?.trim()) existing.review = review.trim();
    await existing.save();
    await syncProductRating(existing.productId);
    return res.json({ success: true, error: false, message: "Review updated", data: existing });
  } catch (e) {
    return res.status(500).json({ message: e.message, error: true, success: false });
  }
}

// ─── DELETE /api/review/:reviewId ─────────────────────────────────────────────
export async function deleteReview(req, res) {
  try {
    const existing = await ReviewModel.findById(req.params.reviewId);
    if (!existing) {
      return res.status(404).json({ message: "Review not found", error: true, success: false });
    }
    if (existing.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not authorised", error: true, success: false });
    }
    const productId = existing.productId;
    await ReviewModel.findByIdAndDelete(req.params.reviewId);
    await syncProductRating(productId);
    return res.json({ success: true, error: false, message: "Review deleted" });
  } catch (e) {
    return res.status(500).json({ message: e.message, error: true, success: false });
  }
}