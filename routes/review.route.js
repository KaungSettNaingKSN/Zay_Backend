import { Router } from "express";
import auth from "../middleware/auth.js";
import { getProductReviews, addReview, updateReview, deleteReview } from "../controllers/review.controller.js";

const reviewRouter = Router();

reviewRouter.get("/:productId",     getProductReviews);          // public
reviewRouter.post("/add", auth,  addReview);                 // requires login
reviewRouter.put("/:reviewId",auth,  updateReview);              // owner only
reviewRouter.delete("/:reviewId", auth, deleteReview);           // owner only

export default reviewRouter;