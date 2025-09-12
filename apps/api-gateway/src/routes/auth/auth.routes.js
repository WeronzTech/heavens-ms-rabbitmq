import express from "express";
import {
  tenantLogin,
  userLogin,
} from "../../controllers/auth/auth.controller.js";

const authRoutes = express.Router();

authRoutes.post("/tenant-login", tenantLogin);
authRoutes.post("/user-login", userLogin);
// authRouter.post("/student-logout", validateToken, logout);

// authRouter.post("/forgot-password", validateToken, forgotPasswordStudent);

export default authRoutes;
