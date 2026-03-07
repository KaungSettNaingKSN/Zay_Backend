import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import connecteDB from "./config/connectDb.js";
import userRouter from "./routes/user.route.js";
import categoryRouter from "./routes/category.route.js";
import productRouter from "./routes/product.route.js";
import cartRouter from "./routes/cart.route.js";
import myListRouter from "./routes/myList.route.js";
import addressRouter from "./routes/address.route.js";
import homeSliderRouter from "./routes/homeSlider.route.js";
import reviewRouter from "./routes/review.route.js";
import paymentRouter from "./routes/payment.route.js";
import orderRouter from "./routes/order.route.js";

const app = express();

// ── Allowed origins ───────────────────────────────────────────────────────────
// Add as many as you need — pull from .env for production URLs
const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // Vite dev (user frontend)
  'http://localhost:5174',   // Vite dev (admin frontend, if separate port)
  process.env.FRONTEND_URL,  // e.g. https://yourstore.com
  process.env.ADMIN_URL,     // e.g. https://admin.yourstore.com
].filter(Boolean)            // remove undefined entries if env vars not set

app.use(cors({
  origin: (requestOrigin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!requestOrigin) return callback(null, true)

    if (ALLOWED_ORIGINS.includes(requestOrigin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: ${requestOrigin} is not allowed`))
    }
  },
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))
app.use(helmet({ crossOriginResourcePolicy: false }))

app.get('/', (req, res) => {
  res.json({ message: 'server is running on port ' + process.env.PORT })
})

app.use('/api/user',       userRouter)
app.use('/api/category',   categoryRouter)
app.use('/api/product',    productRouter)
app.use('/api/cart',       cartRouter)
app.use('/api/mylist',     myListRouter)
app.use('/api/address',    addressRouter)
app.use('/api/homeSlider', homeSliderRouter)
app.use('/api/review',     reviewRouter)
app.use('/api/payment',    paymentRouter)
app.use('/api/order',      orderRouter)

const startServer = async () => {
  try {
    await connecteDB()
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`)
      console.log(`Allowed origins:`, ALLOWED_ORIGINS)
    })
  } catch (error) {
    console.error('Server failed to start ❌', error)
  }
}

startServer()