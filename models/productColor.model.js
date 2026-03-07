import mongoose from "mongoose";

const productColorSchema = mongoose.Schema({
    name: {
        type: String,
        default: ""
    },
    color: { 
        type: String, 
        default: "" 
    }, 
},{
    timestamps: true
})

const ProductColorModel = mongoose.model("productColor", productColorSchema)

export default ProductColorModel