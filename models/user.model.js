import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Provide name"]
    },
    email: {
        type: String,
        required: [true, "Provide email"],
        unique: true
    },
    password: {
        type: String,
        default: "",
    },
    avatar: {
        type: String,
        default: ""
    },
    mobile: {
        type: Number,
        default: null
    },
    refresh_token: {
        type: String,
        default: ""
    },
    verify_email: {
        type: Boolean,
        default: false
    },
    last_login_Date: {
        type: Date,
        default: ""
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Suspended'],
        default: 'Active'
    },
    address_details: [{
        type: mongoose.Schema.ObjectId,
        ref: 'address',
    }],
    shopping_cart: [{
        type: mongoose.Schema.ObjectId,
        ref: 'cartProduct',
    }],
    order_history: [{
        type: mongoose.Schema.ObjectId,
        ref: 'order',
    }],
    otp: {
        type: String,
        default: null
    },
    otp_expiry: {
        type: Date,
        default: null
    },
    role: {
        type: String,
        enum: ['Admin', 'User'],
        default: 'User'
    },
    signInWithGoogle:{
        type: Boolean,
        default: false
    }
},{
    timestamps: true
})

const UserModel = mongoose.model("User", userSchema)

export default UserModel