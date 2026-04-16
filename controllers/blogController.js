import Blog from "../models/Blog.js";
import slugify from "slugify";

/* --- CREATE BLOG --- */
export const createBlog = async (req, res) => {
  try {
    const { title, excerpt, content, tag, author } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image required ❌" });
    }

    // JSON.parse isliye kyunki FormData array ko string bana deta hai
    const parsedContent = typeof content === "string" ? JSON.parse(content) : content;

    const blog = await Blog.create({
      title,
      excerpt,
      tag,
      author,
      content: parsedContent, 
      image: req.file.path, // Cloudinary link
      slug: slugify(title, { lower: true, strict: true }),
      date: new Date().toLocaleDateString("en-GB"), 
    });

    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* --- GET ALL BLOGS --- */
export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* --- GET SINGLE BLOG (By Slug) --- */
export const getBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) return res.status(404).json({ message: "Blog not found ❌" });
    res.status(200).json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* --- UPDATE BLOG --- */
export const updateBlog = async (req, res) => {
  try {
    const data = { ...req.body };

    if (req.file) {
      data.image = req.file.path;
    }

    if (data.content && typeof data.content === "string") {
      data.content = JSON.parse(data.content);
    }

    if (data.title) {
      data.slug = slugify(data.title, { lower: true, strict: true });
    }

    const blog = await Blog.findByIdAndUpdate(req.params.id, data, { new: true });
    res.status(200).json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* --- DELETE BLOG --- */
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: "Blog not found ❌" });
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Blog deleted successfully ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};