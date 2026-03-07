import mongoose from "mongoose";

const addressSchema = mongoose.Schema({
  address_line: {
    type:    String,
    default: "",
  },
  address_name: {
    type:    String,
    default: "Home",
  },
  city: {
    type:    String,
    default: "",
  },
  state: {
    type:    String,
    default: "",
  },
  pincode: {
    type:    String,
    default: "",
  },
  country: {
    type:    String,
    default: "",
  },
  mobile: {
    type:    String,
    default: "",
  },
  status: {
    type:    Boolean,
    default: false,
  },
  userId: {
    type:     mongoose.Schema.ObjectId,
    ref:      "User",
    required: true,
  },
}, {
  timestamps: true,
})

const AddressModel = mongoose.model("address", addressSchema)
export default AddressModel