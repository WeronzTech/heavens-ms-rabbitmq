import Client from "../models/client.modal.js";
import bcrypt from "bcrypt";
import axios from "axios";
import nodemailer from "nodemailer";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { CLIENT_PATTERN } from "../../../../libs/patterns/client/client.pattern.js";
import { getClientByEmail } from "../service/client.service.js";

// export const getClientByEmail = async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ message: "Email is required." });
//     }

//     const client = await Client.findOne({ email, isDeleted: false });

//     if (!client) {
//       return res.status(404).json({ message: "User does not exist." });
//     }

//     res.status(200).json({
//       message: "Client found successfully.",
//       data: client,
//     });
//   } catch (error) {
//     console.error("Error fetching client by email:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

createResponder(CLIENT_PATTERN.CLIENT.GET_CLIENT_BY_EMAIL, async (data) => {
  return await getClientByEmail(data?.email);
});

export const validateClientCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password.",
      });
    }

    const client = await Client.findOne({ email, isDeleted: false }).select(
      "+password"
    );

    if (!client) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    if (!client.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email for login.",
      });
    }

    const isMatch = await bcrypt.compare(password, client.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    if (!client.approved || !client.loginEnabled) {
      return res.status(403).json({
        success: false,
        message: "Client account is not approved or has been disabled.",
      });
    }

    const { password: clientPassword, ...clientData } = client.toObject();

    res.status(200).json({
      success: true,
      message: "Client credentials validated successfully.",
      data: clientData,
    });
  } catch (error) {
    console.error("Error during client validation:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, contact } = req.body;

    if (!name || !email || !password || !contact) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    // 1. Check if user exists
    const existing = await Client.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    }

    // 2. Get Admin role from auth-service
    const adminRole = await fetchRoleByName("admin");
    if (!adminRole || adminRole.roleName !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin role not found or invalid",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create admin user
    const admin = await Client.create({
      name,
      email,
      password: hashedPassword,
      contact,
      role: adminRole._id,
      isVerified: true,
      loginEnabled: true,
      companyName: "Heavens Admin",
      status: "approved",
    });

    const { password: _, ...adminData } = admin.toObject();
    return res.status(201).json({ success: true, data: adminData });
  } catch (error) {
    console.error("Error creating admin:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const registerClient = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      companyName,
      address,
      contact,
      role,
      roleName,
    } = req.body;

    if (!name || !email || !password || !companyName || !address || !contact) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(409).json({
        success: false,
        message: "A client with this email is already registered.",
      });
    }

    const adminRole = await fetchRoleByName("client");
    if (!adminRole || adminRole.roleName !== "client") {
      return res.status(400).json({
        success: false,
        message: "Client role not found or invalid",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = new Client({
      name,
      email,
      password: hashedPassword,
      companyName,
      address,
      contact,
      role,
      status: "pending",
    });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    newClient.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    newClient.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    await newClient.save();

    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

      const templatePath = path.join(
        __dirname,
        "../templates/emailVerification.hbs"
      );
      const source = fs.readFileSync(templatePath, "utf-8").toString();
      const template = handlebars.compile(source);

      const replacements = {
        name: newClient.name,
        verificationLink: verificationUrl,
        currentYear: new Date().getFullYear(),
        FRONTEND_URL: process.env.FRONTEND_URL,
      };

      const htmlToSend = template(replacements);

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Heavens Living" <${process.env.EMAIL_USER}>`,
        to: newClient.email,
        subject: "Verify Your Email Address for Heavens Living",
        html: htmlToSend,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    const { password: clientPassword, ...clientData } = newClient.toObject();

    return res.status(201).json({
      success: true,
      message:
        "Client registered successfully. Please check your email to verify your account.",
      data: clientData,
    });
  } catch (error) {
    console.error("Error registering client:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const client = await Client.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!client) {
      return res.status(400).json({
        success: false,
        message: "Verification token is invalid or has expired.",
      });
    }

    client.isVerified = true;
    client.emailVerificationToken = null;
    client.emailVerificationExpires = null;

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Email has been verified successfully.",
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const client = await Client.findOne({ email, isDeleted: false });

    if (!client) {
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    client.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    client.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await client.save();

    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      const templatePath = path.join(
        __dirname,
        "../templates/forgotPassword.hbs"
      );
      const source = fs.readFileSync(templatePath, "utf-8").toString();

      const template = handlebars.compile(source);

      const replacements = {
        name: client.name,
        resetLink: resetUrl,
        currentYear: new Date().getFullYear(),
        FRONTEND_URL: process.env.FRONTEND_URL,
      };

      const htmlToSend = template(replacements);

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Heavens Living" <${process.env.EMAIL_USER}>`,
        to: client.email,
        subject: "Reset Your Password for Heavens Living",
        html: htmlToSend,
      });
    } catch (emailError) {
      client.resetPasswordToken = undefined;
      client.resetPasswordExpires = undefined;
      await client.save();
      console.error("Failed to send password reset email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Error sending password reset email.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Error in forgot password controller:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const client = await Client.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!client) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired.",
      });
    }

    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: "New password is required." });
    }

    client.password = await bcrypt.hash(password, 10);
    client.resetPasswordToken = undefined;
    client.resetPasswordExpires = undefined;

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Error in reset password controller:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const approveClient = async (req, res) => {
  try {
    const { clientId, permissions } = req.body;

    if (!clientId || !Array.isArray(permissions)) {
      return res
        .status(400)
        .json({ message: "clientId and features are required." });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    if (client.status === "approved") {
      return res.status(400).json({ message: "Client already approved." });
    }

    // Update client status and assign features
    client.status = "approved";
    client.permissions = permissions; // assumes you have a "features" field in the Client model
    await client.save();

    // Notify auth service to enable login and assign features
    await axios.post(
      `${process.env.AUTH_SERVICE_URL}/internal/approveClient`,
      {
        clientId: client._id,
        permissions,
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SECRET_KEY,
        },
      }
    );

    return res.status(200).json({
      message: "Client approved successfully.",
      clientId: client._id,
      features,
    });
  } catch (error) {
    console.error("Error approving client:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
