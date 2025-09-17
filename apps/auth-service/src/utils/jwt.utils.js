import jwt from "jsonwebtoken";
import { Token } from "../models/token.model.js";

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];

    // Check if token is revoked
    const isRevoked = await RevokedToken.exists({ token });
    if (isRevoked) {
      return res.status(401).json({ error: "Token revoked" });
    }

    // Standard JWT verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const generateTokens = async (user, deviceId) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      role: user.userType,
      deviceId,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "30m" }
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
      deviceId,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const token = await Token.findOne({
      userId: decoded.id,
      token: refreshToken,
    });

    if (!token) throw new Error("Invalid refresh token");
    return decoded;
  } catch (error) {
    throw error;
  }
};

export { verifyToken, generateTokens, verifyRefreshToken };
