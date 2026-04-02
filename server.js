import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ CORS fix - apna Hostinger domain daalo
app.use(cors({
    origin: [
        'https://www.wellindia.in',
        'https://wellindia.in',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Uploads folder - Render pe safe way
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ MongoDB connect with retry
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Error:', err.message);
        setTimeout(connectDB, 5000);
    }
};
connectDB();

// ✅ Candidate Schema
const candidateSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    position: String,
    resumePath: String,
    createdAt: { type: Date, default: Date.now }
});
const Candidate = mongoose.model('Candidate', candidateSchema);

// ✅ Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, DOCX files allowed'));
        }
    }
});

// ✅ Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ Transporter verify on startup
transporter.verify((error) => {
    if (error) {
        console.error('Email transporter error:', error.message);
    } else {
        console.log('Email server ready');
    }
});

// ✅ Logo URL (file path ki jagah URL use karo - Render pe file nahi hoti)
const LOGO_URL = 'https://www.wellindia.in/logo.png';
const WEBSITE_URL = 'https://www.wellindia.in';

// ============================================================
// ✅ ROUTE 1: Job Application
// ============================================================
app.post('/api/apply', upload.single('resume'), async (req, res) => {
    try {
        const { name, email, phone, position } = req.body;

        console.log('Apply request:', { name, email, phone, position });

        if (!name || !email || !phone || !position) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const resumePath = req.file ? req.file.path : '';

        // Save to MongoDB
        const newCandidate = new Candidate({ name, email, phone, position, resumePath });
        await newCandidate.save();
        console.log('Candidate saved to DB');

        // HR Email
        const hrMail = {
            from: `"Well India Careers" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL,
            replyTo: email,
            subject: `📋 New Job Application: ${position}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #0d9e8a, #0b8a79); padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">New Job Application Received</h2>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><b>Name:</b></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><b>Email:</b></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><b>Phone:</b></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${phone}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px;"><b>Position Applied:</b></td>
                            <td style="padding: 10px;">
                                <span style="background:#0d9e8a;color:#fff;padding:4px 10px;border-radius:4px;">${position}</span>
                            </td>
                        </tr>
                    </table>
                </div>
                <div style="background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                    <p>This email was generated from your website careers page.</p>
                </div>
            </div>`,
            attachments: resumePath && fs.existsSync(resumePath)
                ? [{ filename: path.basename(resumePath), path: resumePath }]
                : []
        };

        // Candidate Auto-reply
        const candidateAutoReply = {
            from: `"Well India" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `✅ Application Received – ${position}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                <div style="padding: 20px; text-align: center; border-bottom: 2px solid #0d9e8a;">
                    <img src="${LOGO_URL}" style="width:120px; height:auto;" alt="Well India" />
                </div>
                <div style="padding: 25px;">
                    <h2 style="color:#0d9e8a;">Hello ${name},</h2>
                    <p>Thank you for applying at <b>Well India</b>!</p>
                    <p>We have received your application for the position of <b>${position}</b>.</p>
                    <p>Our HR team will review your profile and get back to you shortly.</p>
                    <div style="margin-top:20px;">
                        <a href="${WEBSITE_URL}"
                           style="background:#0d9e8a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">
                           Visit Website
                        </a>
                    </div>
                </div>
                <div style="background:#f9f9f9;padding:15px;text-align:center;font-size:12px;color:#999;">
                    <p style="margin: 5px 0;">Well India</p>
                    <p style="margin: 5px 0;">202, 2nd Floor, Hans Bhawan Building, Bahadurshah Zafar Marg, ITO, New Delhi – 110002</p>
                    <div style="margin-top: 10px;">
                        <a href="https://www.instagram.com/wellindia.in/" style="color: #0d9e8a; text-decoration: none; margin: 0 10px;">Instagram</a>
                        <a href="https://www.facebook.com/wellindia.in/" style="color: #0d9e8a; text-decoration: none; margin: 0 10px;">Facebook</a>
                    </div>
                    <p>Well India - NGO Consulting Services</p>
                </div>
            </div>`
            // ✅ No file attachments - logo URL use ho raha hai
        };

        await Promise.all([
            transporter.sendMail(hrMail),
            transporter.sendMail(candidateAutoReply)
        ]);

        console.log('Both emails sent for application');
        res.status(200).json({ success: true, message: 'Application submitted successfully!' });

    } catch (error) {
        console.error('Apply route error:', error);
        res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
    }
});

// ============================================================
// ✅ ROUTE 2: Service Inquiry / Contact Form
// ============================================================
app.post('/send-email', async (req, res) => {
    try {
        const { name, mobile, email, services, location } = req.body;

        console.log('Send-email request:', { name, mobile, email, services, location });

        if (!name || !mobile || !email || !services) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }

        // Service/HR Email
        const serviceMail = {
            from: `"Well India Website" <${process.env.EMAIL_USER}>`,
            to: process.env.SERVICE_EMAIL,
            replyTo: email,
            subject: `🚀 New Inquiry: ${services}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #0d9e8a, #0b8a79); padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0;">New Service Request</h2>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <p style="font-size: 16px; color: #333;">You have received a new inquiry from your website.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><b>Name:</b></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><b>Mobile:</b></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${mobile}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><b>Email:</b></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><b>Service:</b></td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                                <span style="background:#0d9e8a;color:#fff;padding:4px 10px;border-radius:4px;">${services}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px;"><b>Location:</b></td>
                            <td style="padding: 10px;">${location || 'N/A'}</td>
                        </tr>
                    </table>
                </div>
                <div style="background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                    <p>This email was generated from your website.</p>
                </div>
            </div>`
        };

        // Customer Auto-reply
        const customerAutoReply = {
            from: `"Well India" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `We've Received Your Inquiry`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                <div style="padding: 20px; text-align: center; border-bottom: 2px solid #0d9e8a;">
                    <img src="${LOGO_URL}" style="width:120px; height:auto;" alt="Well India" />
                </div>
                <div style="padding: 25px;">
                    <h2 style="color:#0d9e8a;">Hello ${name},</h2>
                    <p>Thank you for contacting <b>Well India</b>.</p>
                    <p>We received your request for <b>${services}</b>. Our team will contact you soon.</p>
                    <p><b>Your Contact:</b> ${mobile}</p>
                    <div style="margin-top:20px;">
                        <a href="${WEBSITE_URL}"
                           style="background:#0d9e8a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">
                           Visit Website
                        </a>
                    </div>
                </div>
                <div style="background:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#999;">
                    <p style="margin: 5px 0;">Well India</p>
                    <p style="margin: 5px 0;">202, 2nd Floor, Hans Bhawan Building, Bahadurshah Zafar Marg, ITO, New Delhi – 110002</p>
                    <div style="margin-top: 10px;">
                        <a href="https://www.instagram.com/wellindia.in/" style="color: #0d9e8a; text-decoration: none; margin: 0 10px;">Instagram</a>
                        <a href="https://www.facebook.com/wellindia.in/" style="color: #0d9e8a; text-decoration: none; margin: 0 10px;">Facebook</a>
                    </div>
                    <p>Well India - NGO Consulting Services</p>
                </div>
            </div>`
            // ✅ No file attachments - logo URL use ho raha hai
        };

        await Promise.all([
            transporter.sendMail(serviceMail),
            transporter.sendMail(customerAutoReply)
        ]);

        console.log('Both emails sent for inquiry');
        res.status(200).json({ success: true, message: 'Inquiry submitted successfully!' });

    } catch (error) {
        console.error('Send-email route error:', error);
        res.status(500).json({ success: false, message: 'Email failed', error: error.message });
    }
});

// ✅ Health check route - Render ko alive rakhne ke liye
app.get('/', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ✅ 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));