import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://wellindia.in"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));
// Mail transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// API route
app.post("/send-email", async (req, res) => {
  const { name, email, mobile, services, location } = req.body;

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.HR_EMAIL, // where you receive mail
      subject: "New Contact Form Submission 🚀",
      html: `
        <h2>New Enquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${mobile}</p>
        <p><strong>Service:</strong> ${services}</p>
        <p><strong>Message:</strong> ${location}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Email sent successfully ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error sending email ❌" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});