import mongoose from "mongoose";

const homeSliderSchema = mongoose.Schema({
    images: [{
        type: String,
        require: true
    }],
},{
    timestamps: true
})

const HomeSliderModel = mongoose.model("HomeSlider", homeSliderSchema)

export default HomeSliderModel