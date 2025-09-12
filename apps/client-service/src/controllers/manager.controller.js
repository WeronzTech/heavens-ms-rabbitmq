import Manager from "../models/manager.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { uploadToFirebase } from "../utils/imageOperation.js";
import axios from "axios";

export const registerManager = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      salary,
      propertyId,
      gender,
      address,
    } = req.body;
    console.log(req.body);
    const files = req.files;

    if (!name || !email || !phone || !password || !salary || !propertyId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    let photoUrl = null;
    let aadharUrl = null;

    if (files) {
      if (files.photo && files.photo[0]) {
        console.log("Uploading photo...");
        photoUrl = await uploadToFirebase(files.photo[0], "staff-photos");
        console.log("Photo uploaded to:", photoUrl);
      }
      if (files.aadharImage && files.aadharImage[0]) {
        console.log("Uploading Aadhar front image...");
        aadharUrl = await uploadToFirebase(
          files.aadharImage[0],
          "staff-documents"
        );
        console.log("Aadhar front image uploaded to:", aadharUrl);
      }
    }

    const existingManager = await Manager.findOne({ email });
    if (existingManager) {
      return res.status(409).json({
        success: false,
        message: "A manager with this email already exists.",
      });
    }

    // const adminRole = await fetchRoleByName(roleName);
    // if (!adminRole || adminRole.roleName !== roleName) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `${roleName} role not found or invalid`,
    //   });
    // }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newManager = new Manager({
      name,
      email,
      contactNumber: phone,
      password: hashedPassword,
      role,
      salary,
      photo: photoUrl,
      aadhaarImage: aadharUrl,
      propertyId,
      gender,
      address,
    });

    await newManager.save();
    const { password: managerPassword, ...managerData } = newManager.toObject();

    res.status(201).json({
      success: true,
      message: "Manager registered successfully.",
      data: managerData,
    });
  } catch (error) {
    console.error("Error registering manager:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getManagerByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    const manager = await Manager.findOne({ email });
    if (!manager) {
      return res.status(404).json({ message: "Manager does not exist." });
    }
    res.status(200).json({
      message: "Manager found successfully.",
      data: manager,
    });
  } catch (error) {
    console.error("Error fetching manager by email:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const validateManagerCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password.",
      });
    }
    const manager = await Manager.findOne({ email }).select("+password");
    if (!manager) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    if (!manager.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email for login.",
      });
    }

    const isMatch = await bcrypt.compare(password, manager.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }
    if (!manager.loginEnabled) {
      return res.status(403).json({
        success: false,
        message: "Manager account has been disabled.",
      });
    }
    const { password: managerPassword, ...managerData } = manager.toObject();
    res.status(200).json({
      success: true,
      message: "Manager credentials validated successfully.",
      data: managerData,
    });
  } catch (error) {
    console.error("Error during manager validation:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const forgotPasswordManager = async (req, res) => {
  try {
    const { email } = req.body;
    const manager = await Manager.findOne({ email });
    if (!manager) {
      return res.status(200).json({
        success: true,
        message:
          "If a manager with that email exists, a password reset link has been sent.",
      });
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    manager.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    manager.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await manager.save();
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/manager/reset-password/${resetToken}`;
      const templatePath = path.join(
        __dirname,
        "../templates/forgotPassword.hbs"
      );
      const source = fs.readFileSync(templatePath, "utf-8").toString();
      const template = handlebars.compile(source);
      const replacements = {
        name: manager.name,
        resetLink: resetUrl,
        currentYear: new Date().getFullYear(),
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
        to: manager.email,
        subject: "Reset Your Manager Password for Heavens Living",
        html: htmlToSend,
      });
    } catch (emailError) {
      manager.resetPasswordToken = undefined;
      manager.resetPasswordExpires = undefined;
      await manager.save();
      console.error("Failed to send manager password reset email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Error sending password reset email.",
      });
    }
    return res.status(200).json({
      success: true,
      message:
        "If a manager with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Error in manager forgot password controller:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const resetPasswordManager = async (req, res) => {
  try {
    const { password } = req.body;
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");
    const manager = await Manager.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!manager) {
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
    manager.password = await bcrypt.hash(password, 10);
    manager.resetPasswordToken = undefined;
    manager.resetPasswordExpires = undefined;
    await manager.save();
    return res.status(200).json({
      success: true,
      message: "Manager password has been reset successfully.",
    });
  } catch (error) {
    console.error("Error in manager reset password controller:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const getAllManagers = async (req, res) => {
  try {
    const { propertyId, joinDate, status, name } = req.query;
    const filter = {};

    if (propertyId) {
      filter.propertyId = propertyId;
    }
    if (joinDate) {
      filter.joinDate = joinDate;
    }
    if (status) {
      filter.status = status;
    }
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }
    // console.log("Manager filter", filter);

    const managers = await Manager.find(filter);
    // console.log("Managers", managers);
    res.status(200).json({
      success: true,
      message: "All managers retrieved successfully.",
      data: managers,
    });
  } catch (error) {
    console.error("Error during manager retrieval:", error);
  }
};

// export const getManagerById = async (req, res) => {
//   try {
//     const manager = await Manager.findById(req.params.id);
//     if (!manager) {
//       return res.status(404).json({
//         success: false,
//         message: "Manager not found.",
//       });
//     }
//     return res.status(200).json({
//       success: true,
//       message: "Manager retrieved successfully.",
//       data: manager,
//     });
//   } catch (error) {
//     console.error("Error during manager retrieval:", error);
//   }
// };
export const getManagerById = async (req, res) => {
  try {
    const manager = await Manager.findById(req.params.id);

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found.",
      });
    }

    const managerObject = manager.toObject();

    if (manager.propertyId && manager.propertyId.length > 0) {
      const propertyId = manager.propertyId[0];
      try {
        const propertyResponse = await axios.get(
          `${process.env.PROPERTY_SERVICE_URL}/property/${propertyId}`
        );

        if (propertyResponse.data) {
          const propertyData = propertyResponse.data;
          managerObject.property = {
            _id: propertyData._id,
            name: propertyData.propertyName,
          };
        } else {
          managerObject.property = { name: "Property details not found" };
        }
      } catch (error) {
        console.error(
          `Failed to fetch property details for ID ${propertyId}:`,
          error.message
        );
        managerObject.property = { name: "Could not fetch property" };
      }
    }

    return res.status(200).json({
      success: true,
      message: "Manager retrieved successfully.",
      data: managerObject,
    });
  } catch (error) {
    console.error("Error during manager retrieval:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
    });
  }
};

export const editManager = async (req, res) => {
  try {
    const updatedData = req.body;
    const hashedPassword = await bcrypt?.hash(updatedData?.password, 10);
    updatedData.password = hashedPassword;
    const manager = await Manager.findByIdAndUpdate(req.params.id, updatedData);
    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Manager updated successfully.",
      data: manager,
    });
  } catch (error) {
    console.error("Error during manager update:", error);
  }
};

export const deleteManager = async (req, res) => {
  try {
    const manager = await Manager.findByIdAndDelete(req.params.id);
    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Manager deleted successfully.",
    });
  } catch (error) {
    console.error("Error during manager deletion:", error);
  }
};

export const changeManagerStatus = async (req, res) => {
  try {
    const managerId = req.params.id;
    const manager = await Manager.findById(managerId);

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found.",
      });
    }

    if (manager?.status === "Active") {
      manager.status = "Inactive";
    } else {
      manager.status = "Active";
    }

    await manager.save();

    return res.status(200).json({
      success: true,
      message: "Manager status updated successfully.",
    });
  } catch (error) {
    console.error("Error during manager status update:", error);
  }
};
