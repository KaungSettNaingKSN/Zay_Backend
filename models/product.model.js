import mongoose from "mongoose";

const productSchema = mongoose.Schema({
  name: {
    type: String,
    require: true,
  },
  description: {
    type: String,
    require: true,
  },
  images: [{
    type: String,
    require: true
  }],
  brand: {
    type: String,
    default: ""
  },
  price: {
    type: Number,
    default: 0
  },
  oldPrice: {
    type: Number,
    default: 0
  },
  catName: {
    type: String,
    default: ""
  },
  catId: {
    type: String,
    default: ""
  },
  subCatId: {
    type: String,
    default: ""
  },
  subCatName: {
    type: String,
    default: ""
  },
  thirdsubCatId: {
    type: String,
    default: ""
  },
  thirdsubCatName: {
    type: String,
    default: ""
  },
  countInStock: {
    type: Number,
    require: true,
  },
  rating: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  discount: {
    type: Number,
    require: true
  },
  sale: {
    type: Number,
    default: 0
  },
  productRam: [{
    type: String,
    default: null
  }],
  size: [{
    type: String,
    default: null
  }],
  productWeight: [{
    type: String,
    default: null
  }],

  numReviews:  { type: Number, default: 0 }, 

  productColor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productColor',
    default: null
  }],

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  dateCreated: {
    type: Date,
    default: Date.now()
  }
}, {
  timestamps: true
})

const ProductModel = mongoose.model("Product", productSchema)
export default ProductModel