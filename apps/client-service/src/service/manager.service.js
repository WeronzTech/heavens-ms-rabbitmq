import {
  uploadToFirebase,
  deleteFromFirebase,
} from "../../../../libs/common/imageOperation.js";
import { sendRPCRequest } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import Manager from "../models/manager.model.js";
import bcrypt from "bcrypt";

export const registerManager = async (data) => {
  try {
    const {
      name,
      jobTitle,
      email,
      phone,
      password,
      role,
      salary,
      propertyId,
      gender,
      address,
      panCardNumber,
      files,
    } = data;

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !salary ||
      !propertyId ||
      !files ||
      !files.photo ||
      !files.aadharImage ||
      !files.panCardImage ||
      panCardNumber
    ) {
      return {
        success: false,
        status: 400,
        message: "Missing required fields.",
      };
    }

    let photoUrl = null;
    let aadharUrl = null;
    let panCardUrl = null;

    // Directly handle file data from the payload
    if (files) {
      if (files.photo && files.photo[0].buffer) {
        const photoFile = {
          buffer: Buffer.from(files.photo[0].buffer, "base64"),
          mimetype: files.photo[0].mimetype,
          originalname: files.photo[0].originalname,
        };
        photoUrl = await uploadToFirebase(photoFile, "staff-photos");
      }
      if (files.aadharImage && files.aadharImage[0].buffer) {
        const aadharFile = {
          buffer: Buffer.from(files.aadharImage[0].buffer, "base64"),
          mimetype: files.aadharImage[0].mimetype,
          originalname: files.aadharImage[0].originalname,
        };
        aadharUrl = await uploadToFirebase(aadharFile, "staff-documents");
      }
      if (files.panCardImage && files.panCardImage[0].buffer) {
        const panCardFile = {
          buffer: Buffer.from(files.panCardImage[0].buffer, "base64"),
          mimetype: files.panCardImage[0].mimetype,
          originalname: files.panCardImage[0].originalname,
        };
        panCardUrl = await uploadToFirebase(panCardFile, "staff-documents");
      }
    }

    const existingManager = await Manager.findOne({ email });
    if (existingManager) {
      return {
        success: false,
        status: 409,
        message: "A manager with this email already exists.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newManager = new Manager({
      name,
      jobTitle,
      email,
      contactNumber: phone,
      password: hashedPassword,
      role,
      salary,
      photo: photoUrl,
      aadhaarImage: aadharUrl,
      panCardImage: panCardUrl,
      propertyId,
      gender,
      address,
      panCardNumber,
    });

    await newManager.save();
    const { password: _, ...managerData } = newManager.toObject();

    return {
      success: true,
      status: 201,
      message: "Manager registered successfully.",
      data: managerData,
    };
  } catch (error) {
    console.error("Error registering manager:", error);
    return {
      success: false,
      status: 500,
      message: "Internal Server Error",
    };
  }
};

export const getManagerByEmail = async (data) => {
  try {
    const { email } = data;
    if (!email) {
      return { success: false, status: 400, message: "Email is required." };
    }
    const manager = await Manager.findOne({ email });
    if (!manager) {
      return {
        success: false,
        status: 404,
        message: "Manager does not exist.",
      };
    }
    return {
      success: true,
      status: 200,
      message: "Manager found successfully.",
      data: manager,
    };
  } catch (error) {
    console.error("Error fetching manager by email:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const validateManagerCredentials = async (data) => {
  const { email, password } = data;
  try {
    if (!email || !password) {
      return {
        success: false,
        status: 400,
        message: "Please provide both email and password.",
      };
    }
    const manager = await Manager.findOne({ email }).select("+password");
    if (!manager) {
      return { success: false, status: 401, message: "Invalid credentials." };
    }
    if (!manager.isVerified) {
      return {
        success: false,
        status: 401,
        message: "Please verify your email for login.",
      };
    }
    const isMatch = await bcrypt.compare(password, manager.password);
    if (!isMatch) {
      return { success: false, status: 401, message: "Invalid credentials." };
    }
    if (!manager.loginEnabled) {
      return {
        success: false,
        status: 403,
        message: "Manager account has been disabled.",
      };
    }
    const { password: _, ...managerData } = manager.toObject();
    return {
      success: true,
      status: 200,
      message: "Manager credentials validated successfully.",
      data: managerData,
    };
  } catch (error) {
    console.error("Error during manager validation:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const forgotPasswordManager = async (data) => {
  const { email } = data;
  try {
    const manager = await Manager.findOne({ email });
    if (!manager) {
      return {
        success: true, // Obfuscate whether user exists
        status: 200,
        message:
          "If a manager with that email exists, a password reset link has been sent.",
      };
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    manager.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    manager.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await manager.save();

    // Fire-and-forget email sending
    (async () => {
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
          secure: false,
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await transporter.sendMail({
          from: `"Heavens Living" <${process.env.EMAIL_USER}>`,
          to: manager.email,
          subject: "Reset Your Manager Password for Heavens Living",
          html: htmlToSend,
        });
      } catch (emailError) {
        console.error(
          "Failed to send manager password reset email:",
          emailError
        );
        // Don't revert token, let it expire naturally.
      }
    })();

    return {
      success: true,
      status: 200,
      message:
        "If a manager with that email exists, a password reset link has been sent.",
    };
  } catch (error) {
    console.error("Error in manager forgot password service:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const resetPasswordManager = async (data) => {
  const { token, password } = data;
  try {
    if (!token || !password) {
      return {
        success: false,
        status: 400,
        message: "Token and new password are required.",
      };
    }
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const manager = await Manager.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!manager) {
      return {
        success: false,
        status: 400,
        message: "Password reset token is invalid or has expired.",
      };
    }

    manager.password = await bcrypt.hash(password, 10);
    manager.resetPasswordToken = undefined;
    manager.resetPasswordExpires = undefined;
    await manager.save();

    return {
      success: true,
      status: 200,
      message: "Manager password has been reset successfully.",
    };
  } catch (error) {
    console.error("Error in manager reset password service:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const getAllManagers = async (data) => {
  try {
    const { propertyId, joinDate, status, name } = data;

    const filter = {};
    if (propertyId) filter.propertyId = { $in: [propertyId] };
    if (joinDate) filter.joinDate = joinDate;
    if (status) filter.status = status;
    if (name) filter.name = { $regex: name, $options: "i" };

    const managers = await Manager.find(filter);
    return {
      success: true,
      status: 200,
      message: "All managers retrieved successfully.",
      data: managers,
    };
  } catch (error) {
    console.error("Error during manager retrieval:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const getManagerById = async (data) => {
  try {
    const { id } = data;

    const manager = await Manager.findById(id);
    if (!manager) {
      return { success: false, status: 404, message: "Manager not found." };
    }

    const managerObject = manager.toObject();
    if (manager.propertyId && manager.propertyId.length > 0) {
      try {
        const propertyResponse = await sendRPCRequest(
          PROPERTY_PATTERN.PROPERTY.GET_PROPERTY_BY_ID,
          { id: manager.propertyId[0] }
        );
        if (propertyResponse.data) {
          managerObject.property = {
            _id: propertyResponse.data._id,
            name: propertyResponse.data.propertyName,
          };
        }
      } catch (axiosError) {
        console.error(
          `Failed to fetch property details for ID ${manager.propertyId[0]}:`,
          axiosError.message
        );
        managerObject.property = { name: "Could not fetch property details" };
      }
    }
    return {
      success: true,
      status: 200,
      message: "Manager retrieved successfully.",
      data: managerObject,
    };
  } catch (error) {
    console.error("Error during manager retrieval:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const editManager = async (data) => {
  try {
    const { id, updates, files } = data;
    const manager = await Manager.findById(id);
    if (!manager) {
      return { success: false, status: 404, message: "Manager not found." };
    }

    if (files) {
      if (files.photo && files.photo.buffer) {
        if (manager.photo) await deleteFromFirebase(manager.photo);
        const photoFile = {
          buffer: Buffer.from(files.photo.buffer, "base64"),
          mimetype: files.photo.mimetype,
          originalname: files.photo.originalname,
        };
        updates.photo = await uploadToFirebase(photoFile, "staff-photos");
      }
      if (files.aadharImage && files.aadharImage.buffer) {
        if (manager.aadhaarImage)
          await deleteFromFirebase(manager.aadhaarImage);
        const aadharFile = {
          buffer: Buffer.from(files.aadharImage.buffer, "base64"),
          mimetype: files.aadharImage.mimetype,
          originalname: files.aadharImage.originalname,
        };
        updates.aadhaarImage = await uploadToFirebase(
          aadharFile,
          "staff-documents"
        );
      }
      if (files.panCardImage && files.panCardImage.buffer) {
        if (manager.panCardImage)
          await deleteFromFirebase(manager.panCardImage);
        const panCardFile = {
          buffer: Buffer.from(files.panCardImage.buffer, "base64"),
          mimetype: files.panCardImage.mimetype,
          originalname: files.panCardImage.originalname,
        };
        updates.panCardImage = await uploadToFirebase(
          panCardFile,
          "staff-documents"
        );
      }
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedManager = await Manager.findByIdAndUpdate(id, updates, {
      new: true,
    });

    return {
      success: true,
      status: 200,
      message: "Manager updated successfully.",
      data: updatedManager,
    };
  } catch (error) {
    console.error("Error during manager update:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const deleteManager = async (data) => {
  try {
    const { id } = data;
    const manager = await Manager.findByIdAndDelete(id);
    if (!manager) {
      return { success: false, status: 404, message: "Manager not found." };
    }
    if (manager.photo) await deleteFromFirebase(manager.photo);
    if (manager.aadhaarImage) await deleteFromFirebase(manager.aadhaarImage);

    return {
      success: true,
      status: 200,
      message: "Manager deleted successfully.",
    };
  } catch (error) {
    console.error("Error during manager deletion:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};

export const changeManagerStatus = async (data) => {
  try {
    const { id } = data;
    const manager = await Manager.findById(id);
    if (!manager) {
      return { success: false, status: 404, message: "Manager not found." };
    }
    manager.status = manager.status === "Active" ? "Inactive" : "Active";
    await manager.save();
    return {
      success: true,
      status: 200,
      message: "Manager status updated successfully.",
      data: manager,
    };
  } catch (error) {
    console.error("Error during manager status update:", error);
    return { success: false, status: 500, message: "Internal Server Error" };
  }
};
