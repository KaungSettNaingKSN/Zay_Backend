import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.MONGODB_URL) {
    throw new Error(
        "Please provide MONGODB_URL in .env file."
    )
}

async function connecteDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected DB');
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

export default connecteDB;