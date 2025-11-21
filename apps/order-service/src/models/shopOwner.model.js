    
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const shopOwnerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please enter full name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please enter an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    phoneNumber: {
      type: String,
      required: [true, "Please enter phone number"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // Prevents password from being returned in queries by default
    },
    refreshToken: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// --- Middleware: Hash Password before saving ---
shopOwnerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// --- Method: Compare Password for Login ---
shopOwnerSchema.methods.isPasswordCorrect = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// --- Method: Generate Refresh Token ---
shopOwnerSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY, // e.g., "7d"
    }
  );
};

// --- Method: Generate Access Token (Optional, but recommended) ---
shopOwnerSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY, // e.g., "15m"
    }
  );
};

// --- Method: Generate Password Reset Token ---
shopOwnerSchema.methods.getResetPasswordToken = function () {
  // 1. Generate a random token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // 2. Hash the token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 3. Set expire time (e.g., 15 minutes from now)
  this.resetPasswordExpiry = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

const ShopOwner = mongoose.model("ShopOwner", shopOwnerSchema);
export default ShopOwner;