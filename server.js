import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { articles } from './articles.js';
import { Feed } from "feed";
import dns from 'dns';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// --- CONFIGURATION ---
const PORT = process.env.PORT || 5000;
const LOGO_URL = 'https://res.cloudinary.com/dtarufspt/image/upload/f_auto,q_auto/logo_oulnzw';
const WEBSITE_URL = 'https://wellindia.in';
const SENDER_EMAIL = 'wellindiainquiry@gmail.com';

// Middleware
app.use(cors({
    origin: ['https://www.wellindia.in', 'https://wellindia.in', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload folder setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

const Candidate = mongoose.model('Candidate', new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    position: String,
    resumePath: String,
    createdAt: { type: Date, default: Date.now }
}));

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ✅ NODEMAILER CONFIG
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587, // Aap 465 bhi try kar sakte hain agar 587 block ho raha ho
    secure: false, // 465 ke liye true karein
    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.EMAIL_PASS
    },
    // ✅ Yeh settings Render/Deployment ke timeout ko rokengi
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    pool: true, // Connection open rakhta hai
    tls: {
        rejectUnauthorized: false // Deployed servers par certificate issue fix karta hai
    }
});

transporter.verify((error) => {
    if (error) console.log("❌ SMTP connection failed:", error.message);
    else console.log("🚀 Brevo SMTP is ready to send emails!");
});


// ============================================================
// ✅ EMAIL TEMPLATES (Simple & Clean — screenshot style)
// ============================================================

// 1. HR Notification — New Job Application
function hrEmailTemplate({ name, position, phone, email }) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">

        <tr>
          <td style="background:#0d9e8a;padding:20px 30px;text-align:center;">
            <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New Job Application</h2>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 30px 10px;">
            <p style="margin:0;color:#444;font-size:15px;">You have received a new job application from your website careers form.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:10px 30px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr style="border-bottom:1px solid #eeeeee;">
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;width:40%;">Full Name:</td>
                <td style="padding:12px 0;color:#555;font-size:14px;">${name}</td>
              </tr>
              <tr style="border-bottom:1px solid #eeeeee;">
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;">Position:</td>
                <td style="padding:12px 0;font-size:14px;">
                  <span style="background:#0d9e8a;color:#fff;padding:3px 12px;border-radius:4px;font-size:13px;font-weight:600;">${position}</span>
                </td>
              </tr>
              <tr style="border-bottom:1px solid #eeeeee;">
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;">Mobile:</td>
                <td style="padding:12px 0;color:#555;font-size:14px;">${phone}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;">Email ID:</td>
                <td style="padding:12px 0;font-size:14px;"><a href="mailto:${email}" style="color:#0d9e8a;text-decoration:none;">${email}</a></td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 30px 20px;">
            <p style="margin:0;color:#888;font-size:13px;">📎 Resume is attached to this email.</p>
          </td>
        </tr>

        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eeeeee;padding:14px 30px;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">This email was generated from your Well India Website Careers Form.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// 2. Candidate Auto-Reply
function candidateEmailTemplate({ name, position }) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">

        <tr>
          <td style="background:#0d9e8a;padding:20px 30px;text-align:center;">
            <img src="${LOGO_URL}" width="120" alt="Well India" style="display:block;margin:0 auto 10px;"/>
            <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Application Received</h2>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 30px 10px;">
            <p style="margin:0 0 14px;color:#333;font-size:15px;">Dear <strong>${name}</strong>,</p>
            <p style="margin:0;color:#555;font-size:15px;line-height:1.6;">
              Thank you for applying to <strong>Well India</strong>. We have successfully received your application for the position below.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 30px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr style="border-bottom:1px solid #eeeeee;">
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;width:40%;">Position Applied:</td>
                <td style="padding:12px 0;font-size:14px;">
                  <span style="background:#0d9e8a;color:#fff;padding:3px 12px;border-radius:4px;font-size:13px;font-weight:600;">${position}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;">Status:</td>
                <td style="padding:12px 0;color:#0d9e8a;font-size:14px;font-weight:600;">Under Review</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 30px 28px;">
            <p style="margin:0;color:#555;font-size:14px;line-height:1.6;">
              Our HR team will review your profile and get back to you shortly. For any queries, contact us at
              <a href="mailto:${SENDER_EMAIL}" style="color:#0d9e8a;text-decoration:none;">${SENDER_EMAIL}</a>.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eeeeee;padding:14px 30px;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">This email was generated from your Well India Website Careers Form.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// 3. Service Inquiry Notification
function inquiryEmailTemplate({ name, services, mobile, email, location }) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">

        <tr>
          <td style="background:#0d9e8a;padding:20px 30px;text-align:center;">
            <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New Service Request</h2>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 30px 10px;">
            <p style="margin:0;color:#444;font-size:15px;">You have received a new inquiry from your website contact form.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:10px 30px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr style="border-bottom:1px solid #eeeeee;">
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;width:40%;">Full Name:</td>
                <td style="padding:12px 0;color:#555;font-size:14px;">${name}</td>
              </tr>
              <tr style="border-bottom:1px solid #eeeeee;">
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;">Mobile:</td>
                <td style="padding:12px 0;color:#555;font-size:14px;">${mobile}</td>
              </tr>
              <tr style="border-bottom:1px solid #eeeeee;">
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;">Email ID:</td>
                <td style="padding:12px 0;font-size:14px;"><a href="mailto:${email}" style="color:#0d9e8a;text-decoration:none;">${email}</a></td>
              </tr>
              <tr style="border-bottom:1px solid #eeeeee;">
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;">Service Requested:</td>
                <td style="padding:12px 0;font-size:14px;">
                  <span style="background:#0d9e8a;color:#fff;padding:3px 12px;border-radius:4px;font-size:13px;font-weight:600;">${services}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;font-weight:700;color:#333;font-size:14px;">Message:</td>
                <td style="padding:12px 0;color:#555;font-size:14px;">${location || 'Not specified'}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eeeeee;padding:14px 30px;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">This email was generated from your Well India Website Contact Form.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}


// ============================================================
// ✅ ROUTES
// ============================================================

// 1. Job Application
app.post('/api/apply', upload.single('resume'), async (req, res) => {
    try {
        const { name, email, phone, position } = req.body;
        const resumePath = req.file ? req.file.path : '';

        // 1. Data Save (Pehle Database check karein)
        const newCandidate = new Candidate({ name, email, phone, position, resumePath });
        await newCandidate.save();
        console.log("✅ Candidate saved to DB");

        // 2. HR Mail (Sequence 1)
        try {
            await transporter.sendMail(hrMail);
            console.log("✅ HR Mail Sent");
        } catch (e) { console.error("❌ HR Mail Error:", e.message); }

        // 3. Auto-reply (Sequence 2)
        try {
            await transporter.sendMail(candidateMail);
            console.log(`✅ Auto-reply sent to ${email}`);
        } catch (e) { console.error("❌ Auto-reply Error:", e.message); }

        // Success response hamesha bhejein agar DB mein save ho gaya hai
        res.status(200).json({ success: true, message: 'Application submitted!' });

    } catch (error) {
        console.error("❌ Main Route Error:", error.message);
        res.status(500).json({ success: false, error: "Submission failed" });
    }
});

// 2. Service Inquiry
app.post('/send-email', async (req, res) => {
    try {
        const { name, mobile, email, services, location } = req.body;

        const mailOptions = {
            from: `"Well India Inquiry" <${SENDER_EMAIL}>`,
            to: process.env.SERVICE_EMAIL,
            subject: `New Service Inquiry: ${services}`,
            html: inquiryEmailTemplate({ name, services, mobile, email, location })
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Inquiry sent successfully!' });
    } catch (error) {
        console.error("Inquiry Route Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. RSS Feed
app.get('/rss.xml', (req, res) => {
    const feed = new Feed({
        title: "Well India Blog",
        id: WEBSITE_URL,
        link: WEBSITE_URL,
        language: "en",
    });
    articles.forEach(post => {
        feed.addItem({
            title: post.title,
            id: `${WEBSITE_URL}/blog/${post.slug}`,
            link: `${WEBSITE_URL}/blog/${post.slug}`,
            date: new Date(post.date),
        });
    });
    res.set('Content-Type', 'application/rss+xml').send(feed.rss2());
});

app.get('/', (req, res) => res.json({ status: 'Server is running...' }));

app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));