import express from "express";
import { registerAdmin } from "../controllers/adminController.js";
import jwt from "jsonwebtoken";
const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Static Admin Check (Aap isse DB se bhi check kar sakte hain)
  if (email === "vs@gmail.com" && password === "vs@123") {
    console.log("ad");
    
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.json({ success: true, token });
  }

  res.status(401).json({ message: "Invalid Gmail or Password" });
});
export default router;