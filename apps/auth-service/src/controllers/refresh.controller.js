// import Token from "../models/token.model.js";
// import {fetchUserAuthData} from "../services/internal.service.js";
// import {generateTokens} from "../utils/jwt.utils.js";
// import jwt from "jsonwebtoken";

// export const refreshAccessToken = async (req, res) => {
//   const {refreshToken, deviceId} = req.body;

//   if (!refreshToken || !deviceId) {
//     return res
//       .status(401)
//       .json({error: "Refresh token and device ID are required"});
//   }

//   try {
//     // Verify the refresh token first
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
//     const userId = decoded.id;

//     // Find the device token document
//     const tokenDoc = await Token.findOne({
//       userId,
//       deviceId,
//     });

//     if (!tokenDoc) {
//       return res
//         .status(403)
//         .json({error: "Invalid refresh token - device not found"});
//     }

//     // Check if the token matches current or previous tokens
//     let isValidToken = false;

//     if (tokenDoc.currentRefreshToken === refreshToken) {
//       isValidToken = true;
//     } else {
//       // Check previous tokens (for token rotation scenarios)
//       isValidToken = tokenDoc.previousRefreshTokens.some(
//         (t) => t.token === refreshToken
//       );
//     }

//     if (!isValidToken) {
//       return res.status(403).json({error: "Invalid refresh token"});
//     }

//     // Get fresh student data
//     const user = await fetchUserAuthData(userId);

//     // Generate new tokens
//     const {accessToken, refreshToken: newRefreshToken} = await generateTokens(
//       user,
//       deviceId
//     );

//     // Update the token document with the new refresh token
//     await Token.updateOne(
//       {userId, deviceId},
//       {
//         $set: {
//           currentRefreshToken: newRefreshToken,
//           lastUsed: new Date(),
//         },
//         $push: {
//           previousRefreshTokens: {
//             $each: [{token: refreshToken, createdAt: new Date()}],
//             $slice: -5, // Keep last 5 refresh tokens
//           },
//         },
//       }
//     );

//     return res.status(200).json({
//       accessToken,
//       refreshToken: newRefreshToken,
//     });
//   } catch (error) {
//     console.error("Refresh token error:", error);

//     if (error.name === "TokenExpiredError") {
//       return res.status(403).json({error: "Refresh token expired"});
//     }
//     if (error.name === "JsonWebTokenError") {
//       return res.status(403).json({error: "Invalid refresh token"});
//     }

//     return res.status(500).json({error: "Internal server error"});
//   }
// };
