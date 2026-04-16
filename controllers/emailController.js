import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();


const resend = new Resend(process.env.RESEND_API_KEY);
console.log(resend);

export const sendEmail = async (req,res)=>{
  const { name, email, mobile, services, location } = req.body;

  if (!name || !email || !mobile) {
    return res.status(400).json({ message: "All fields required ❌" });
  }

  try {
    await resend.emails.send({
      from: "WellIndia <info@wellindia.in>",
      to: ["gurjarvishnu740@gmail.com"],
      subject: "New Service Request",
      html: `<h3>${name}</h3><p>${services}</p>`
    });

    await resend.emails.send({
      from: "WellIndia <info@wellindia.in>",
      to: [email],
      subject: "We received your request",
      html: `<p>Thanks ${name}</p>`
    });

    res.json({ message: "Email sent ✅" });
console.log("email send")
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};