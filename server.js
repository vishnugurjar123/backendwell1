import express from 'express';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { articles } from './articles.js'
import { Feed } from "feed";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: [
        'https://www.wellindia.in',
        'https://wellindia.in',
        'http://localhost:5173',
        'https://backendwell1-1.onrender.com',
        'https://backendwell1.onrender.com',
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Resend client
const resend = new Resend(process.env.RESEND_ID);

// ✅ FROM address — use verified domain once set up on Resend dashboard
// Until domain is verified, use: onboarding@resend.dev (only sends to your own email)
const FROM_CAREERS = 'Well India Careers <onboarding@resend.dev>';
const FROM_WELL    = 'Well India <onboarding@resend.dev>';
const FROM_WEBSITE = 'Well India Website <onboarding@resend.dev>';

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

const candidateSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    position: String,
    resumePath: String,
    createdAt: { type: Date, default: Date.now }
});
const Candidate = mongoose.model('Candidate', candidateSchema);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
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

// ✅ Resend send helper with retry
async function sendEmailWithRetry(mailOptions, retries = 5) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            console.log(`[Attempt ${attempt + 1}/${retries}] Sending to: ${mailOptions.to}`);
            const { data, error } = await resend.emails.send(mailOptions);
            if (error) throw new Error(error.message);
            console.log(`[SUCCESS] Message ID: ${data.id}`);
            return { success: true, messageId: data.id };
        } catch (error) {
            console.error(`[Attempt ${attempt + 1}] Failed: ${error.message}`);
            if (attempt < retries - 1) {
                const delays = [2000, 5000, 10000, 20000, 40000];
                const delay = delays[attempt] || 40000;
                console.log(`Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`All ${retries} attempts failed`);
                return { success: false, error: error.message };
            }
        }
    }
}

const LOGO_URL = 'https://res.cloudinary.com/dtarufspt/image/upload/f_auto,q_auto/logo_oulnzw';
const WEBSITE_URL = 'https://wellindia.in';

app.post('/api/apply', upload.single('resume'), async (req, res) => {
    try {
        const { name, email, phone, position } = req.body;

        if (!name || !email || !phone || !position) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const resumePath = req.file ? req.file.path : '';
        const newCandidate = new Candidate({ name, email, phone, position, resumePath });
        await newCandidate.save();

        res.status(200).json({
            success: true,
            message: 'Application submitted successfully! Check your email for confirmation.',
            candidateId: newCandidate._id
        });

        (async () => {
            try {
                const hrMail = {
                    from: FROM_CAREERS,
                    to: process.env.HR_EMAIL || 'hr@wellindia.in',
                    replyTo: email,
                    subject: `New Job Application: ${position}`,
                    html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #0d9e8a, #0b8a79); padding: 20px; text-align: center;">
                            <h2 style="color: #ffffff; margin: 0;">New Job Application Received</h2>
                        </div>
                        <div style="padding: 20px; background-color: #f9f9f9;">
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                <tr><td style="padding:10px;border-bottom:1px solid #ddd;"><b>Name:</b></td><td style="padding:10px;border-bottom:1px solid #ddd;">${name}</td></tr>
                                <tr><td style="padding:10px;border-bottom:1px solid #ddd;"><b>Email:</b></td><td style="padding:10px;border-bottom:1px solid #ddd;">${email}</td></tr>
                                <tr><td style="padding:10px;border-bottom:1px solid #ddd;"><b>Phone:</b></td><td style="padding:10px;border-bottom:1px solid #ddd;">${phone}</td></tr>
                                <tr><td style="padding:10px;"><b>Position:</b></td><td style="padding:10px;"><span style="background:#0d9e8a;color:#fff;padding:4px 10px;border-radius:4px;">${position}</span></td></tr>
                            </table>
                        </div>
                    </div>`
                };

                const candidateAutoReply = {
                    from: FROM_WELL,
                    to: email,
                    subject: `Application Received – ${position}`,
                    html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="padding: 20px; text-align: center; border-bottom: 2px solid #0d9e8a;">
                            <img src="${LOGO_URL}" style="width:120px; height:auto;" alt="Well India" />
                        </div>
                        <div style="padding: 25px;">
                            <h2 style="color:#0d9e8a;">Hello ${name},</h2>
                            <p>Thank you for applying at <b>Well India</b>!</p>
                            <p>We received your application for <b>${position}</b>. Our HR team will get back to you shortly.</p>
                            <div style="margin-top:20px;">
                                <a href="${WEBSITE_URL}" style="background:#0d9e8a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Visit Website</a>
                            </div>
                        </div>
                        <div style="background:#f9f9f9;padding:15px;text-align:center;font-size:12px;color:#999;">
                            <p>Well India | 202, 2nd Floor, Hans Bhawan Building, ITO, New Delhi – 110002</p>
                            <a href="https://www.instagram.com/wellindia.in/" style="color:#0d9e8a;margin:0 10px;">Instagram</a>
                            <a href="https://www.facebook.com/wellindia.in/" style="color:#0d9e8a;margin:0 10px;">Facebook</a>
                        </div>
                    </div>`
                };

                const [hrResult, candidateResult] = await Promise.allSettled([
                    sendEmailWithRetry(hrMail, 5),
                    sendEmailWithRetry(candidateAutoReply, 5)
                ]);

                console.log(`HR Email: ${hrResult.status === 'fulfilled' ? 'SENT' : 'FAILED'}`);
                console.log(`Candidate Email: ${candidateResult.status === 'fulfilled' ? 'SENT' : 'FAILED'}`);
            } catch (emailError) {
                console.error('Background email error:', emailError.message);
            }
        })();

    } catch (error) {
        console.error('Apply route error:', error);
        res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
    }
});

app.post('/send-email', async (req, res) => {
    try {
        const { name, mobile, email, services, location } = req.body;

        if (!name || !mobile || !email || !services) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }

        res.status(200).json({
            success: true,
            message: 'Inquiry submitted successfully! You will receive a confirmation email shortly.'
        });

        (async () => {
            try {
                const serviceMail = {
                    from: FROM_WEBSITE,
                    to: process.env.SERVICE_EMAIL || 'service@wellindia.in',
                    replyTo: email,
                    subject: `New Inquiry: ${services}`,
                    html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #0d9e8a, #0b8a79); padding: 20px; text-align: center;">
                            <h2 style="color: #ffffff; margin: 0;">New Service Request</h2>
                        </div>
                        <div style="padding: 20px; background-color: #f9f9f9;">
                            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                <tr><td style="padding:10px;border-bottom:1px solid #ddd;"><b>Name:</b></td><td style="padding:10px;border-bottom:1px solid #ddd;">${name}</td></tr>
                                <tr><td style="padding:10px;border-bottom:1px solid #ddd;"><b>Mobile:</b></td><td style="padding:10px;border-bottom:1px solid #ddd;">${mobile}</td></tr>
                                <tr><td style="padding:10px;border-bottom:1px solid #ddd;"><b>Email:</b></td><td style="padding:10px;border-bottom:1px solid #ddd;">${email}</td></tr>
                                <tr><td style="padding:10px;border-bottom:1px solid #ddd;"><b>Service:</b></td><td style="padding:10px;border-bottom:1px solid #ddd;"><span style="background:#0d9e8a;color:#fff;padding:4px 10px;border-radius:4px;">${services}</span></td></tr>
                                <tr><td style="padding:10px;"><b>Location:</b></td><td style="padding:10px;">${location || 'N/A'}</td></tr>
                            </table>
                        </div>
                    </div>`
                };

                const customerAutoReply = {
                    from: FROM_WELL,
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
                                <a href="${WEBSITE_URL}" style="background:#0d9e8a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Visit Website</a>
                            </div>
                        </div>
                        <div style="background:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#999;">
                            <p>Well India | 202, 2nd Floor, Hans Bhawan Building, ITO, New Delhi – 110002</p>
                            <a href="https://www.instagram.com/wellindia.in/" style="color:#0d9e8a;margin:0 10px;">Instagram</a>
                            <a href="https://www.facebook.com/wellindia.in/" style="color:#0d9e8a;margin:0 10px;">Facebook</a>
                        </div>
                    </div>`
                };

                const [serviceResult, customerResult] = await Promise.allSettled([
                    sendEmailWithRetry(serviceMail, 5),
                    sendEmailWithRetry(customerAutoReply, 5)
                ]);

                console.log(`Service Email: ${serviceResult.status === 'fulfilled' ? 'SENT' : 'FAILED'}`);
                console.log(`Customer Email: ${customerResult.status === 'fulfilled' ? 'SENT' : 'FAILED'}`);
            } catch (emailError) {
                console.error('Background email error:', emailError.message);
            }
        })();

    } catch (error) {
        console.error('Send-email route error:', error);
        res.status(500).json({ success: false, message: 'Email failed', error: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.get('/rss.xml', (req, res) => {
    try {
        const rssFeed = new Feed({
            title: "Well India | The Official AYUSH Blog",
            description: "Insights into Traditional Healthcare Projects & Policy",
            id: "https://wellindia.in/",
            link: "https://wellindia.in/",
            language: "en",
            feedLinks: {
                rss: "https://wellindia.in/rss.php"
            }
        });

        articles.forEach(post => {
            const imageUrl = post.image?.split('?')[0];
            rssFeed.addItem({
                title: post.title,
                id: `https://wellindia.in/blog/${post.slug}`,
                link: `https://wellindia.in/blog/${post.slug}`,
                description: post.excerpt,
                content: `<p>${post.excerpt}</p>`,
                date: new Date(post.date),
                author: [{ 
                    name: post.author,
                    email: "info@wellindia.in"
                }],
                enclosure: imageUrl ? { url: imageUrl, length: 0, type: "image/jpeg" } : undefined
            });
        });

        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(rssFeed.rss2());

    } catch (error) {
        console.error("RSS Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/blog/:slug', (req, res) => {
    const post = articles.find(p => p.slug === req.params.slug);

    if (!post) {
        return res.status(404).send('<h1>Article not found</h1>');
    }

    res.send(`
    <html>
      <head>
        <title>${post.title}</title>
        <meta property="og:title" content="${post.title}" />
        <meta property="og:description" content="${post.excerpt}" />
        <meta property="og:image" content="${post.image}" />
        <meta property="og:url" content="https://wellindia.in/blog/${post.slug}" />
        <meta property="og:type" content="article" />
      </head>
      <body>
        <script>
          window.location.href="https://wellindia.in/blog/${post.slug}";
        </script>
      </body>
    </html>
  `);
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});