import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import adminRoutes from "./routes/adminRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";



dotenv.config();

const app = express();

/* ================= MONGODB ================= */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected ✅"))
.catch(err=>console.log(err));

/* ================= MIDDLEWARE ================= */
app.use(cors({
  origin: ["http://localhost:5173","https://wellindia.in"],
  credentials: true
}));

app.use(express.json());

// 🔥 IMPORTANT (image show)
app.use("/uploads", express.static("uploads"));

/* ================= ROUTES ================= */
app.use("/api", emailRoutes);
app.use("/api/auth", adminRoutes);
app.use("/api/blogs", blogRoutes);
app.get("/", (req,res)=>{
  res.send("API running ✅");
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET missing ❌");
}

app.listen(PORT, () => {
  console.log(`Server running on ${PORT} 🚀`);
});