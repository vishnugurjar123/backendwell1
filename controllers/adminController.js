import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* REGISTER (optional - better to disable in production) */
export const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const exist = await Admin.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: "Admin already exists ❌" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await Admin.create({ email, password: hashed });

    res.json({ message: "Admin created successfully ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* LOGIN */
// export const loginAdmin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const admin = await Admin.findOne({ email });
//     if (!admin) return res.status(400).json({ message: "Not found ❌" });

//     const match = await bcrypt.compare(password, admin.password);
//     if (!match) return res.status(400).json({ message: "Wrong password ❌" });

//     const token = jwt.sign(
//       { id: admin._id },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.json({
//       message: "Login successful ✅",
//       token,
//       admin: {
//         id: admin._id,
//         email: admin.email,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };