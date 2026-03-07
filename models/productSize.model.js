import mongoose from "mongoose";

const productSizeSchema = mongoose.Schema({
    name: {
        type: String,
        default: ""
    },
},{
    timestamps: true
})

const ProductSizeModel = mongoose.model("productSize", productSizeSchema)

export default ProductSizeModel