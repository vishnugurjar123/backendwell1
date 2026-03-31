import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// ✅ Schema
const candidateSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    position: String,
    resumePath: String
});
const Candidate = mongoose.model('Candidate', candidateSchema);

// ✅ Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) =>
        cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ✅ Single transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ================== APPLY JOB ==================
// HR_EMAIL pe jaayega + candidate ko auto-reply
app.post('/api/apply', upload.single('resume'), async (req, res) => {
    try {
        const { name, email, phone, position } = req.body;

        if (!name || !email || !phone || !position) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const resumePath = req.file ? req.file.path : '';

        // ✅ Save to DB
        const newCandidate = new Candidate({ name, email, phone, position, resumePath });
        await newCandidate.save();

        // ✅ Mail to HR
        const hrMail = {
            from: `"${name}" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL,         // ← HR Gmail
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
            attachments: resumePath
                ? [{ filename: path.basename(resumePath), path: resumePath }]
                : []
        };

        // ✅ Auto-reply to Candidate
        const candidateAutoReply = {
            from: `"Well India" <${process.env.EMAIL_USER}>`,
            to: email,                          // ← Candidate ka email
            subject: `✅ Application Received – ${position}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                <div style="padding: 20px; text-align: center; border-bottom: 2px solid #0d9e8a;">
                    <img src="cid:logo" style="width:120px;" />
                </div>
                <div style="padding: 25px;">
                    <h2 style="color:#0d9e8a;">Hello ${name},</h2>
                    <p>Thank you for applying at <b>Well India</b>!</p>
                    <p>We have received your application for the position of <b>${position}</b>.</p>
                    <p>Our HR team will review your profile and get back to you shortly.</p>
                    <div style="margin-top:20px;">
                        <a href="https://www.wellindia.in/"
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
            </div>`,
            attachments: [
                { filename: 'logo.png', path: './assets/logo.png', cid: 'logo' }
            ]
        };

        // ✅ Send both emails
        await Promise.all([
            transporter.sendMail(hrMail),
            transporter.sendMail(candidateAutoReply)
        ]);

        res.status(200).json({ message: 'Application submitted successfully!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ================== SEND EMAIL (Service Inquiry) ==================
// SERVICE_EMAIL pe jaayega + user ko auto-reply
app.post('/send-email', async (req, res) => {
    try {
        const { name, mobile, email, services, location } = req.body;

        if (!name || !mobile || !email || !services) {
            return res.status(400).json({ message: "All fields required" });
        }

        // ✅ Mail to Service Team
        const serviceMail = {
            from: `"${name}" <${process.env.EMAIL_USER}>`,
            to: process.env.SERVICE_EMAIL,     // ← Service Email (alag)
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

        // ✅ Auto-reply to Customer
        const customerAutoReply = {
            from: `"Well India" <${process.env.EMAIL_USER}>`,
            to: email,                          // ← Customer ka email
            subject: `We've Received Your Inquiry`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                <div style="padding: 20px; text-align: center; border-bottom: 2px solid #0d9e8a;">
                    <img src="cid:logo" style="width:120px;" />
                </div>
                <div style="padding: 25px;">
                    <h2 style="color:#0d9e8a;">Hello ${name},</h2>
                    <p>Thank you for contacting <b>Well India</b>.</p>
                    <p>We received your request for <b>${services}</b>. Our team will contact you soon.</p>
                    <p><b>Your Contact:</b> ${mobile}</p>
                    <div style="margin-top:20px;">
                        <a href="https://www.wellindia.in/"
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
            </div>`,
            attachments: [
                { filename: 'logo.png', path: './assets/logo.png', cid: 'logo' }
            ]
        };

        // ✅ Send both emails
        await Promise.all([
            transporter.sendMail(serviceMail),
            transporter.sendMail(customerAutoReply)
        ]);

        res.status(200).json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Email failed" });
    }
});

// ================== SERVER ==================
app.listen(5000, () => console.log('Server running on port 5000'));