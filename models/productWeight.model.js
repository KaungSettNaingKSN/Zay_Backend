import mongoose from "mongoose";

const productWeightSchema = mongoose.Schema({
    name: {
        type: String,
        default: ""
    },
},{
    timestamps: true
})

const ProductWeightModel = mongoose.model("productWeight", productWeightSchema)

export default ProductWeightModel