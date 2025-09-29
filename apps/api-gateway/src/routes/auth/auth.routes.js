import express from "express";
import {
  forgotPasswordUser,
  refreshAccessToken,
  resetPassword,
  tenantLogin,
  userLogin,
} from "../../controllers/auth/auth.controller.js";

const authRoutes = express.Router();

authRoutes.post("/tenant-login", tenantLogin);
authRoutes.post("/user-login", userLogin);
authRoutes.post("/forgot-password", forgotPasswordUser);
authRoutes.post("/reset-password", resetPassword);
authRoutes.post("/refresh", refreshAccessToken);

export default authRoutes;
