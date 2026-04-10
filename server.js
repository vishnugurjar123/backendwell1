import express from 'express';
import nodemailer from 'nodemailer';
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


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(' MongoDB Connected');
    } catch (err) {
        console.error(' MongoDB Error:', err.message);
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

console.log('\n' + '='.repeat(60));
console.log(' INITIALIZING RENDER-OPTIMIZED EMAIL CONFIG');
console.log('='.repeat(60) + '\n');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 15000,
    socketTimeout: 15000,
    greetingTimeout: 10000,
    tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
    },
    pool: {
        maxConnections: 3,
        maxMessages: 50,
        rateDelta: 5000,
        rateLimit: 2
    },
    logger: true,
    debug: true,
    name: 'wellindia.in'
});


console.log(' Verifying Gmail connection...');
transporter.verify((error, success) => {
    if (error) {
        console.error(' EMAIL TRANSPORTER ERROR:');
        console.error('   Code:', error.code);
        console.error('   Message:', error.message);
        console.error('\n  TROUBLESHOOTING:');
        console.error('   1. Check EMAIL_USER in .env');
        console.error('   2. Check EMAIL_PASS in .env (must be 16-char app password)');
        console.error('   3. Verify Gmail 2FA is enabled');
        console.error('   4. Generate new app password from https://myaccount.google.com/apppasswords\n');
    } else {
        console.log(' EMAIL TRANSPORTER READY');
        console.log('   Host: smtp.gmail.com');
        console.log('   Port: 587');
        console.log('   Status: Connected\n');
    }
});


async function sendEmailWithRetryRender(mailOptions, retries = 5) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            console.log(`\n [Attempt ${attempt + 1}/${retries}] Sending email...`);
            console.log(`   To: ${mailOptions.to}`);
            console.log(`   Subject: ${mailOptions.subject.substring(0, 50)}...`);

            const info = await transporter.sendMail(mailOptions);

            console.log(` [SUCCESS] Email delivered!`);
            console.log(`   Message ID: ${info.messageId}`);
            console.log(`   Response: ${info.response}\n`);

            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error(` [Attempt ${attempt + 1}] Failed!`);
            console.error(`   Code: ${error.code}`);
            console.error(`   Error: ${error.message}`);

            if (attempt < retries - 1) {

                const delays = [2000, 5000, 10000, 20000, 40000];
                const delay = delays[attempt] || 40000;

                console.log(` Retrying in ${delay / 1000}s...\n`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`\n [FAILED] All ${retries} attempts failed\n`);
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

        console.log('\n' + '='.repeat(60));
        console.log(' JOB APPLICATION RECEIVED');
        console.log('='.repeat(60));
        console.log(`Name: ${name}`);
        console.log(`Email: ${email}`);
        console.log(`Phone: ${phone}`);
        console.log(`Position: ${position}`);
        console.log(`position:${position}`)

        if (!name || !email || !phone || !position) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const resumePath = req.file ? req.file.path : '';

        // Save to MongoDB
        const newCandidate = new Candidate({ name, email, phone, position, resumePath });
        await newCandidate.save();
        console.log(` Saved to MongoDB with ID: ${newCandidate._id}\n`);

       
        res.status(200).json({
            success: true,
            message: 'Application submitted successfully! Check your email for confirmation.',
            candidateId: newCandidate._id
        });

     
        (async () => {
            console.log(' Starting background email sending...\n');

            try {
                // HR Email
                const hrMail = {
                    from: `"Well India Careers" <${process.env.EMAIL_USER}>`,
                    to: process.env.HR_EMAIL || 'hr@wellindia.in',
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
                            <p>Well India Careers | Website Application</p>
                        </div>
                    </div>`
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
                };

                // Send both emails
                const [hrResult, candidateResult] = await Promise.allSettled([
                    sendEmailWithRetryRender(hrMail, 5),
                    sendEmailWithRetryRender(candidateAutoReply, 5)
                ]);

                console.log('\n' + '='.repeat(60));
                console.log(' EMAIL SENDING RESULTS');
                console.log('='.repeat(60));
                console.log(`HR Email: ${hrResult.status === 'fulfilled' ? ' SENT' : ' FAILED'}`);
                console.log(`Candidate Email: ${candidateResult.status === 'fulfilled' ? ' SENT' : ' FAILED'}`);
                console.log('='.repeat(60) + '\n');

            } catch (emailError) {
                console.error(' Background email error:', emailError.message);
            }
        })();

    } catch (error) {
        console.error(' Apply route error:', error);
        res.status(500).json({ success: false, message: 'Something went wrong', error: error.message });
    }
});


app.post('/send-email', async (req, res) => {
    try {
        const { name, mobile, email, services, location } = req.body;

        console.log('\n' + '='.repeat(60));
        console.log(' SERVICE INQUIRY RECEIVED');
        console.log('='.repeat(60));
        console.log(`Name: ${name}`);
        console.log(`Email: ${email}`);
        console.log(`Mobile: ${mobile}`);
        console.log(`Service: ${services}`);
        console.log(`Location: ${location}\n`);

        if (!name || !mobile || !email || !services) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }

  
        res.status(200).json({
            success: true,
            message: 'Inquiry submitted successfully! You will receive a confirmation email shortly.'
        });

 
        (async () => {
            console.log('📧 Starting background email sending...\n');

            try {
                // Service/HR Email
                const serviceMail = {
                    from: `"Well India Website" <${process.env.EMAIL_USER}>`,
                    to: process.env.SERVICE_EMAIL || 'service@wellindia.in',
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
                            <p>Website Inquiry Form</p>
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

                };

              
                const [serviceResult, customerResult] = await Promise.allSettled([
                    sendEmailWithRetryRender(serviceMail, 5),
                    sendEmailWithRetryRender(customerAutoReply, 5)
                ]);

                console.log('\n' + '='.repeat(60));
                console.log('EMAIL SENDING RESULTS');
                console.log('='.repeat(60));
                console.log(`Service Email: ${serviceResult.status === 'fulfilled' ? 'SENT' : ' FAILED'}`);
                console.log(`Customer Email: ${customerResult.status === 'fulfilled' ? ' SENT' : ' FAILED'}`);
                console.log('='.repeat(60) + '\n');

            } catch (emailError) {
                console.error(' Background email error:', emailError.message);
            }
        })();

    } catch (error) {
        console.error(' Send-email route error:', error);
        res.status(500).json({ success: false, message: 'Email failed', error: error.message });
    }
});


app.get('/', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
    res.json({ status: 'server is runing', timestamp: new Date().toISOString() })
});

app.get('/rss.xml', (req, res) => {
    try {
        const rssFeed = new Feed({
            title: "Well India | The Official AYUSH Blog",
            description: "Insights into Traditional Healthcare Projects & Policy",
            id: "https://wellindia.in/",
            link: "https://wellindia.in/",
            language: "en",
            favicon: "https://www.wellindia.in/logo1.jpg"
        });

        articles.forEach(post => {
            const imageUrl = post.image?.split('?')[0];

            rssFeed.addItem({
                title: post.title,
                id: `https://wellindia.in/blog/${post.slug}`,
                link: `https://wellindia.in/blog/${post.slug}`,
                description: post.excerpt,

                // ✅ VERY IMPORTANT
                content: `<p>${post.excerpt}</p>`,

                date: new Date(post.date),

                author: [{ name: post.author }],

                enclosure: imageUrl
                    ? {
                        url: imageUrl,
                        length: 0,
                        type: "image/jpeg"
                    }
                    : undefined
            });
        });

        res.set('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(rssFeed.rss2());

    } catch (error) {
        console.error("RSS Error:", error);
        res.status(500).send("Internal Server Error");
    }
});
app.get('/blog/:slug', (req, res) => {
  const post = articles.find(p => p.slug === req.params.slug);

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
// server (same domain pe)

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});


app.use((err, req, res, next) => {
    console.error(' Global error:', err);
    res.status(500).json({ success: false, message: err.message });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log(` SERVER RUNNING ON PORT ${PORT}`);
    console.log('='.repeat(60) + '\n');
});