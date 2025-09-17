import dotenv from "dotenv";

dotenv.config();

export default {
  service: process.env.EMAIL_SERVICE || "Gmail",
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: `"Heavens Living" <${process.env.EMAIL_USER}>`,
  tls: {
    rejectUnauthorized: false,
  },
};
