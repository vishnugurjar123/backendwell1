import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { articles } from './articles.js';
import { Feed } from "feed";
import dns from 'dns';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['https://www.wellindia.in', 'https://wellindia.in', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload folder setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

const Candidate = mongoose.model('Candidate', new mongoose.Schema({
    name: String, email: String, phone: String, position: String, resumePath: String, createdAt: { type: Date, default: Date.now }
}));

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`)
});
const upload = multer({ storage });

// ✅ NODEMAILER CONFIG (Extra Timeouts for Render)
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, 
    auth: {
        user: process.env.BREVO_USER, 
        pass: process.env.EMAIL_PASS  
    },
    connectionTimeout: 30000, // 30 seconds wait
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: { rejectUnauthorized: false }
});

// --- ROUTES ---

// 1. Job Application (AUTO-REPLY REMOVED)
app.post('/api/apply', upload.single('resume'), async (req, res) => {
    try {
        const { name, email, phone, position } = req.body;
        const resumePath = req.file ? req.file.path : '';

        // 1. Data Save
        const newCandidate = new Candidate({ name, email, phone, position, resumePath });
        await newCandidate.save();
        console.log("✅ Candidate saved to DB");

        // 2. Sirf HR ko mail bhejein
        const hrMail = {
            from: `"Well India Careers" <wellindiainquiry@gmail.com>`,
            to: process.env.HR_EMAIL,
            subject: `New Application: ${position} from ${name}`,
            html: `<h3>New Job Application Received</h3>
                   <p><b>Name:</b> ${name}</p>
                   <p><b>Position:</b> ${position}</p>
                   <p><b>Phone:</b> ${phone}</p>
                   <p><b>Email:</b> ${email}</p>`,
            attachments: req.file ? [{ filename: req.file.originalname, path: req.file.path }] : []
        };

        await transporter.sendMail(hrMail);
        console.log("✅ Mail sent to HR");

        res.status(200).json({ success: true, message: 'Application submitted!' });

    } catch (error) {
        console.error("❌ Submission Error:", error.message);
        // Agar mail fail bhi ho jaye, lekin DB mein save ho gaya hai toh 200 hi bhejein
        res.status(200).json({ success: true, message: 'Submitted, but mail notification failed.' });
    }
});

// 2. Service Inquiry
app.post('/send-email', async (req, res) => {
    try {
        const { name, mobile, email, services, location } = req.body;

        const mailOptions = {
            from: `"Well India Inquiry" <wellindiainquiry@gmail.com>`,
            to: process.env.SERVICE_EMAIL,
            subject: `New Service Inquiry: ${services}`,
            html: `<h2>New Inquiry Details</h2>
                   <p><b>Name:</b> ${name}</p>
                   <p><b>Service:</b> ${services}</p>
                   <p><b>Mobile:</b> ${mobile}</p>
                   <p><b>Email:</b> ${email}</p>
                   <p><b>Location:</b> ${location}</p>`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Inquiry sent successfully!' });
    } catch (error) {
        console.error("❌ Inquiry Error:", error.message);
        res.status(500).json({ success: false, error: "Email server busy" });
    }
});

// 3. RSS & Root
app.get('/rss.xml', (req, res) => {
    const feed = new Feed({ title: "Well India Blog", id: "https://wellindia.in/", link: "https://wellindia.in/", language: "en" });
    articles.forEach(post => feed.addItem({ title: post.title, id: `https://wellindia.in/blog/${post.slug}`, link: `https://wellindia.in/blog/${post.slug}`, date: new Date(post.date) }));
    res.set('Content-Type', 'application/rss+xml').send(feed.rss2());
});

app.get('/', (req, res) => res.json({ status: 'Server Live' }));

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));