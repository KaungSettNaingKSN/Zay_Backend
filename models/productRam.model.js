import mongoose from "mongoose";

const productRamSchema = mongoose.Schema({
    name: {
        type: String,
        default: ""
    },
},{
    timestamps: true
})

const ProductRamModel = mongoose.model("productRam", productRamSchema)

export default ProductRamModel