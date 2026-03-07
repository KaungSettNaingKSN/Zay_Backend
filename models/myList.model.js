import mongoose from "mongoose";

const myListSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "userId is required"],
  },
  productId: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: [true, "productId is required"],
  },
}, {
  timestamps: true
})

// Prevent a user from adding the same product twice
myListSchema.index({ userId: 1, productId: 1 }, { unique: true });

const myListModel = mongoose.model("myList", myListSchema)
export default myListModel