import Client from "../models/client.modal.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import handlebars from "handlebars";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { AUTH_PATTERN } from "../../../../libs/patterns/auth/auth.pattern.js";

export const getClientByEmail = async (email) => {
  try {
    if (!email) {
      return {
        success: false,
        status: 400,
        message: "Email is required.",
      };
    }

    const client = await Client.findOne({ email, isDeleted: false });

    if (client) {
      return {
        success: true,
        status: 200,
        message: "Client found successfully.",
        data: client,
      };
    } else {
      return {
        success: false,
        status: 404,
        message: "Client with this email does not exist.",
      };
    }
  } catch (error) {
    console.error("Error in getClientByEmail service:", error);
    return {
      success: false,
      status: 500,
      message: "An internal server error occurred while fetching the client.",
    };
  }
};

export const validateClientCredentials = async (data) => {
  const { email, password } = data;
  try {
    if (!email || !password) {
      return {
        success: false,
        status: 400,
        message: "Please provide both email and password.",
      };
    }

    const client = await Client.findOne({ email, isDeleted: false }).select(
      "+password"
    );

    if (!client) {
      return { success: false, status: 401, message: "Invalid credentials." };
    }

    if (!client.isVerified) {
      return {
        success: false,
        status: 401,
        message: "Please verify your email for login.",
      };
    }

    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return { success: false, status: 401, message: "Invalid credentials." };
    }

    if (!client.approved || !client.loginEnabled) {
      return {
        success: false,
        status: 403,
        message: "Client account is not approved or has been disabled.",
      };
    }

    const { password: _, ...clientData } = client.toObject();

    return {
      success: true,
      status: 200,
      message: "Client credentials validated successfully.",
      data: clientData,
    };
  } catch (error) {
    console.error("Error during client validation:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const registerAdmin = async (data) => {
  const { name, email, password, contact } = data;
  try {
    if (!name || !email || !password || !contact) {
      return { success: false, status: 400, message: "Missing fields" };
    }

    const existing = await Client.findOne({ email });
    if (existing) {
      return {
        success: false,
        status: 409,
        message: "Email already in use",
      };
    }

    const adminRole = await sendRPCRequest(AUTH_PATTERN.ROLE.GET_ROLE_BY_NAME, {
      name: "admin",
    });
    if (!adminRole || adminRole?.data?.roleName !== "admin") {
      return {
        success: false,
        status: 400,
        message: "Admin role not found or invalid",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Client.create({
      name,
      email,
      password: hashedPassword,
      contact,
      role: adminRole?.data?._id,
      isVerified: true,
      loginEnabled: true,
      companyName: "Heavens Admin",
      status: "approved",
    });

    const { password: _, ...adminData } = admin.toObject();
    return { success: true, status: 201, data: adminData };
  } catch (error) {
    console.error("Error creating admin:", error.message);
    return {
      success: false,
      status: 500,
      message: "Internal server error",
    };
  }
};

export const registerClient = async (data) => {
  const { name, email, password, companyName, address, contact, role } = data;
  try {
    if (!name || !email || !password || !companyName || !address || !contact) {
      return {
        success: false,
        status: 400,
        message: "Missing required fields.",
      };
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return {
        success: false,
        status: 409,
        message: "A client with this email is already registered.",
      };
    }

    // In a real scenario, the role ID would be fetched via RPC from the auth service.
    const clientRole = await sendRPCRequest(
      AUTH_PATTERN.ROLE.GET_ROLE_BY_NAME,
      {
        name: "client",
      }
    );
    if (!clientRole) {
      return {
        success: false,
        status: 400,
        message: "Client role could not be found.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = new Client({
      name,
      email,
      password: hashedPassword,
      companyName,
      address,
      contact,
      role: clientRole?.data?._id, // Using the fetched role ID
      status: "pending",
    });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    newClient.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    newClient.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    await newClient.save();

    // Fire-and-forget email sending
    (async () => {
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
          secure: false, // Often false for port 587
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
    })();

    const { password: _, ...clientData } = newClient.toObject();

    return {
      success: true,
      status: 201,
      message:
        "Client registered. Please check your email to verify your account.",
      data: clientData,
    };
  } catch (error) {
    console.error("Error registering client:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const verifyEmail = async (data) => {
  const { token } = data;
  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const client = await Client.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!client) {
      return {
        success: false,
        status: 400,
        message: "Verification token is invalid or has expired.",
      };
    }

    client.isVerified = true;
    client.emailVerificationToken = null;
    client.emailVerificationExpires = null;
    await client.save();

    return {
      success: true,
      status: 200,
      message: "Email has been verified successfully.",
    };
  } catch (error) {
    console.error("Error verifying email:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const forgotPassword = async (data) => {
  const { email } = data;
  try {
    const client = await Client.findOne({ email, isDeleted: false });

    if (!client) {
      // Always return a success-like message to prevent email enumeration attacks
      return {
        success: true,
        status: 200,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    client.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    client.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await client.save();

    // Fire-and-forget email sending
    (async () => {
      try {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        // ... (email sending logic as before) ...
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
      }
    })();

    return {
      success: true,
      status: 200,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  } catch (error) {
    console.error("Error in forgot password service:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const resetPassword = async (data) => {
  const { token, password } = data;
  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const client = await Client.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!client) {
      return {
        success: false,
        status: 400,
        message: "Password reset token is invalid or has expired.",
      };
    }

    if (!password) {
      return {
        success: false,
        status: 400,
        message: "New password is required.",
      };
    }

    client.password = await bcrypt.hash(password, 10);
    client.resetPasswordToken = undefined;
    client.resetPasswordExpires = undefined;
    await client.save();

    return {
      success: true,
      status: 200,
      message: "Password has been reset successfully.",
    };
  } catch (error) {
    console.error("Error in reset password service:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const approveClient = async (data) => {
  const { clientId, permissions } = data;
  try {
    if (!clientId || !Array.isArray(permissions)) {
      return {
        status: 400,
        message: "clientId and permissions array are required.",
      };
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return { status: 404, message: "Client not found." };
    }

    if (client.status === "approved") {
      return { status: 400, message: "Client already approved." };
    }

    client.status = "approved";
    await client.save();

    return {
      success: true,
      status: 200,
      message: "Client approved successfully.",
      data: { clientId: client._id },
    };
  } catch (error) {
    console.error("Error approving client:", error);
    return {
      success: false,
      status: 500,
      message: "Server error during approval",
    };
  }
};
