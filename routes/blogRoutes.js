import express from "express";
import { upload } from "../middleware/upload.js";
import { verifyToken } from "../middleware/authMiddleware.js";

import {
  createBlog,
  getBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blogController.js";

const router = express.Router();

/* PUBLIC */
router.get("/", getBlogs);
router.get("/:slug", getBlog);

/* ADMIN */
router.post("/", verifyToken, upload.single("image"), createBlog);
router.put("/:id", verifyToken, upload.single("image"), updateBlog);
router.delete("/:id", verifyToken, deleteBlog);

export default router;