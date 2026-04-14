import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const app = express();



app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      "http://localhost:5173",
      "https://wellindia.in",
      "https://www.wellindia.in"
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));



app.use(express.json());

// ✅ Resend Init
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("API running ✅");
});

// ─── HTML TEMPLATES ────────────────────────────────────────────────────────────

function adminEmailHTML({ name, email, mobile, services, location }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#2aab96;padding:22px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">New Service Request</h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:28px 36px 10px;">
              <p style="margin:0 0 24px;color:#444444;font-size:15px;line-height:1.6;">
                You have received a new inquiry from your website contact form.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e8e8;">
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;width:180px;vertical-align:top;">
                    <span style="font-weight:700;color:#222222;font-size:14px;">Full Name:</span>
                  </td>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;color:#555555;font-size:14px;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;vertical-align:top;">
                    <span style="font-weight:700;color:#222222;font-size:14px;">Mobile:</span>
                  </td>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;color:#555555;font-size:14px;">${mobile}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;vertical-align:top;">
                    <span style="font-weight:700;color:#222222;font-size:14px;">Email ID:</span>
                  </td>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;font-size:14px;">
                    <a href="mailto:${email}" style="color:#2aab96;text-decoration:none;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;vertical-align:top;">
                    <span style="font-weight:700;color:#222222;font-size:14px;">Service Requested:</span>
                  </td>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;">
                    <span style="display:inline-block;background-color:#2aab96;color:#ffffff;padding:5px 14px;border-radius:4px;font-size:13px;font-weight:600;">${services}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;vertical-align:top;">
                    <span style="font-weight:700;color:#222222;font-size:14px;">Message:</span>
                  </td>
                  <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;color:#555555;font-size:14px;">${location}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9f9f9;padding:16px 36px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="margin:0;color:#999999;font-size:12px;">
                This email was generated from your <strong>Well India</strong> Website Contact Form.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function userAutoReplyHTML({ name, mobile, services }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- LOGO -->
          <tr>
            <td align="center" style="padding:24px 30px 16px;">
              <a href="https://www.wellindia.in/" target="_blank">
                <img src="https://res.cloudinary.com/dtarufspt/image/upload/v1775464971/logo_oulnzw.png"
                     alt="Well India" width="160" style="display:block;max-width:160px;"/>
              </a>
            </td>
          </tr>

          <!-- TEAL DIVIDER -->
          <tr>
            <td><div style="height:3px;background:linear-gradient(to right,#2aab96,#1a8a79);"></div></td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px 36px 28px;">
              <h2 style="margin:0 0 18px;color:#2aab96;font-size:22px;font-weight:700;">Hello ${name},</h2>
              <p style="margin:0 0 12px;color:#444444;font-size:15px;line-height:1.7;">
                Thank you for contacting <strong>Well India</strong>.
              </p>
              <p style="margin:0 0 12px;color:#444444;font-size:15px;line-height:1.7;">
                We received your request for <strong>${services}</strong>. Our team will contact you soon.
              </p>
              <p style="margin:0 0 28px;color:#444444;font-size:15px;line-height:1.7;">
                <strong>Your Contact:</strong> ${mobile}
              </p>
              <a href="https://www.wellindia.in/" target="_blank"
                 style="display:inline-block;background-color:#2aab96;color:#ffffff;padding:13px 28px;border-radius:5px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                Visit Website
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#2aab96;padding:26px 30px;text-align:center;">
              <p style="margin:0 0 6px;color:#ffffff;font-size:13px;font-weight:600;">Well India</p>
              <p style="margin:0 0 14px;color:rgba(255,255,255,0.85);font-size:12px;line-height:1.6;">
                202, 2nd Floor, Hans Bhawan Building,<br/>
                Bahadurshah Zafar Marg, ITO, New Delhi – 110002
              </p>
              <p style="margin:0 0 16px;">
                <a href="https://www.instagram.com/wellindia.in/" target="_blank"
                   style="color:#ffffff;text-decoration:none;font-size:13px;margin:0 10px;">instagram</a>
                <a href="https://www.wellindia.in/" target="_blank"
                   style="color:#ffffff;text-decoration:none;font-size:13px;margin:0 10px;">website</a>
              </p>
              <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;">Well India – NGO Consulting Services</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── EMAIL API ─────────────────────────────────────────────────────────────────

app.post("/send-email", async (req, res) => {
  const { name, email, mobile, services, location } = req.body;

  if (!name || !email || !mobile) {
    return res.status(400).json({ message: "All fields required ❌" });
  }

  try {
    // 📩 Admin notification
    const adminResponse = await resend.emails.send({
      from: "WellIndia <info@wellindia.in>",
      to: ["gurjarvishnu740@gmail.com"],
      subject: "🚀 New Service Request – Well India",
      html: adminEmailHTML({ name, email, mobile, services, location }),
    });

    console.log("Admin Mail:", adminResponse);

    // 📩 Auto-reply to user
    const userResponse = await resend.emails.send({
      from: "WellIndia <info@wellindia.in>",
      to: [email],
      subject: "We received your request ✅ – Well India",
      html: userAutoReplyHTML({ name, mobile, services }),
    });

    console.log("User Mail:", userResponse);

    res.status(200).json({
      message: "Emails sent successfully ✅",
      adminId: adminResponse.id,
      userId: userResponse.id,
    });

  } catch (error) {
    console.error("EMAIL ERROR:", error);
    res.status(500).json({
      message: "Failed to send email ❌",
      error: error.message,
    });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});