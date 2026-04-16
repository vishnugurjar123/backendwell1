import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});
console.log("CLOUD NAME:", process.env.CLOUD_NAME);
console.log("API KEY:", process.env.CLOUD_API_KEY);
export default cloudinary;
