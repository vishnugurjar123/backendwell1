import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const app = express();

// ✅ CORS
app.use(cors({
  origin: ["http://localhost:5173", "https://wellindia.in"],
}));

app.use(express.json());

// ✅ Resend Init
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("API running ✅");
});

// ✅ EMAIL API
app.post("/send-email", async (req, res) => {
  const { name, email, mobile, services, location } = req.body;

  // ✅ Validation
  if (!name || !email || !mobile) {
    return res.status(400).json({ message: "All fields required ❌" });
  }

  try {
    // 📩 ADMIN MAIL (Tumhare Gmail par)
    const adminResponse = await resend.emails.send({
      from: "WellIndia <info@send.wellindia.in>", // ✅ IMPORTANT (verified domain)
      to: ["gurjarvishnu740@gmail.com"], // ✅ YOUR EMAIL
      subject: "New Enquiry 🚀",
      html: `
        <h2>New Contact Request</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${mobile}</p>
        <p><b>Service:</b> ${services}</p>
        <p><b>Message:</b> ${location}</p>
      `,
    });

    console.log("Admin Mail:", adminResponse);

    // 📩 AUTO REPLY USER KO
    const userResponse = await resend.emails.send({
      from: "WellIndia <info@send.wellindia.in>",
      to: [email],
      subject: "We received your request ✅",
      html: `
        <h3>Thank you ${name}!</h3>
        <p>We have received your request and our team will contact you shortly.</p>
        <br/>
        <p>— WellIndia Team</p>
      `,
    });

    console.log("User Mail:", userResponse);

    res.status(200).json({
      message: "Email sent successfully ✅",
      adminId: adminResponse.id,
      userId: userResponse.id
    });

  } catch (error) {
    console.error("EMAIL ERROR:", error);
    res.status(500).json({
      message: "Failed to send email ❌",
      error: error.message
    });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});