import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // intro / section
    text: String,
    heading: String,
    body: String,
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    title: String,
    excerpt: String,

    content: [contentSchema], // 🔥 clean reusable schema

    image: String,
    tag: String,

    slug: { type: String, unique: true },

    date: String,
    author: String,
    toc: [String],
    related: [Number],
    featured: Boolean,
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);