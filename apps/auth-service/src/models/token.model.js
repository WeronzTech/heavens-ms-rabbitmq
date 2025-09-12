import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  deviceId: {
    type: String,
    required: true,
  },
  currentRefreshToken: {
    type: String,
    required: true,
  },
  previousRefreshTokens: [
    {
      token: String,
      createdAt: Date,
    },
  ],
  deviceInfo: {
    os: {
      name: String,
      version: String,
      platform: String,
    },
    browser: {
      name: String,
      version: String,
    },
    ip: String,
    geo: String,
    screen: String,
  },
  lastUsed: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "30d", // Longer expiration for device records
  },
});

export const Token = mongoose.model("Token", tokenSchema);
